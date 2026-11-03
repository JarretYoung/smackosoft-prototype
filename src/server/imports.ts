import { randomUUID } from "node:crypto";
import { ImportGamesInput, type ImportReport, type Issue } from "../contract";
import { sourceKeyOf } from "../lib/video-sources";
import { act, Failure, Rollback, unique, type Ctx } from "./core";
import { sessionLabelOf } from "../lib/import-rules";
import { classifyKnownVideos, heldKey, mergeAliases, planImport, type HeldMatch, type KnownVideo } from "./import-plan";
import { saveGuests } from "./accounts";
import { saveGameScores, saveGames, saveMatchPlayers, saveMatches, saveTeams } from "./matches";
import { saveSessions } from "./sessions";
import { saveVideoGames, saveVideoSessions, saveVideos } from "./videos";

type Path = (string | number)[];

/**
 * Runs one of the real save use cases inside the import's transaction. A failure points at an item
 * of that call. `locate` turns the item's index into a place in the import's own input, so the
 * person sees which row or person to fix.
 */
async function located<T>(run: () => Promise<T>, locate: (item: number) => Path): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof Failure) || !error.issues) throw error;
    throw new Failure(
      error.code,
      error.issues.map((issue) =>
        typeof issue.path[0] === "number" ? { ...issue, path: [...locate(issue.path[0]), ...issue.path.slice(1)] } : issue,
      ),
    );
  }
}

type ItemOf<A> = A extends readonly (infer T)[] ? T : never;

/**
 * The records for one save call, each with the row of the file it came from. Adding a record and its row
 * together keeps them in step, so `locate` always points a failure at the right row.
 */
function batchOf<A extends readonly unknown[]>() {
  const items: ItemOf<A>[] = [];
  const rows: number[] = [];
  return {
    items,
    add(row: number, item: ItemOf<A>) {
      items.push(item);
      rows.push(row);
    },
    locate: (item: number): Path => ["rows", rows[item]],
  };
}

export const importGames = act(ImportGamesInput, async (ctx: Ctx, input): Promise<ImportReport> => {
  const { db, actor } = ctx;
  // Two names for one person (Wen and Soong, both @wensoong) become one name before anything else looks at them.
  const merged = mergeAliases(input.rows, input.people);
  const rows = merged.rows;

  // People. A name is an existing account or a new guest.
  const issues: Issue[] = [];
  const linked = input.people.flatMap((p, index) => (p.accountId ? [{ index, id: p.accountId }] : []));
  const found = linked.length
    ? await db.selectFrom("accounts").select("id").where("id", "in", unique(linked.map((l) => l.id))).where("deleted", "=", false).execute()
    : [];
  const live = new Set(found.map((a) => a.id));
  for (const { index, id } of linked) {
    if (!live.has(id)) issues.push({ path: ["people", index, "accountId"], message: "Not found" });
  }

  // Sessions the actor can already edit, found by day and name.
  const dates = unique(rows.map((r) => r.date));
  const mine = await db
    .selectFrom("sessions")
    .innerJoin("session_access", "session_access.session_id", "sessions.id")
    .select(["sessions.id", "sessions.date", "sessions.label"])
    .where("session_access.account_id", "=", actor.accountId)
    .where("session_access.role", "in", ["EDITOR", "MANAGER", "OWNER"])
    .where("sessions.date", "in", dates)
    .orderBy("sessions.created_at")
    .execute();
  const sessionKey = (date: string, label: string) => `${date}\u0000${label}`;
  const existing = new Map<string, string>();
  for (const s of mine) {
    const key = sessionKey(String(s.date).slice(0, 10), s.label);
    if (!existing.has(key)) existing.set(key, s.id);
  }
  const existingIds = [...existing.values()];

  // Matches already in those sessions. A sheet match number finds its match again by the label "Match <number>".
  const heldMatches = existingIds.length
    ? await db.selectFrom("matches").select(["id", "session_id", "label", "format"]).where("session_id", "in", existingIds).execute()
    : [];
  const heldIds = heldMatches.map((m) => m.id);
  const heldTeams = heldIds.length
    ? await db.selectFrom("match_teams").select(["id", "match_id"]).where("match_id", "in", heldIds).orderBy("label").execute()
    : [];
  const heldPlayers = heldTeams.length
    ? await db.selectFrom("match_players").select(["match_team_id", "account_id"]).where("match_team_id", "in", heldTeams.map((t) => t.id)).execute()
    : [];
  const heldGames = heldIds.length ? await db.selectFrom("match_games").select(["match_id", "game_number"]).where("match_id", "in", heldIds).execute() : [];
  const nameOf = new Map(merged.people.flatMap(({ person: p }) => (p.accountId ? [[p.accountId, p.name] as const] : [])));
  const idOfSession = new Map([...existing].map(([key, id]) => [id, key]));
  const savedMatches = new Map<string, HeldMatch>();
  const twice = new Set<string>();
  const heldIdOf = new Map<string, { id: string; teams: string[] }>();
  for (const m of heldMatches) {
    const number = /^Match (.+)$/.exec(m.label)?.[1];
    const session = idOfSession.get(m.session_id);
    if (number === undefined || session === undefined) continue;
    const teams = heldTeams.filter((t) => t.match_id === m.id);
    const sides = [0, 1].map((side) =>
      heldPlayers.filter((p) => p.match_team_id === teams[side]?.id).map((p) => nameOf.get(p.account_id) ?? p.account_id),
    ) as [string[], string[]];
    const key = `${session}\u0000${number}`;
    // The label is not unique in the database, so two matches can share a name. Then no row can say which it means.
    if (savedMatches.has(key)) twice.add(key);
    savedMatches.set(key, { sides, gameNumbers: heldGames.filter((g) => g.match_id === m.id).map((g) => g.game_number), format: m.format });
    heldIdOf.set(key, { id: m.id, teams: teams.map((t) => t.id) });
  }
  rows.forEach((row, index) => {
    if (row.sides && row.match !== undefined && twice.has(heldKey(row.date, sessionLabelOf(row), row.match))) {
      issues.push({ path: ["rows", index, "match"], message: `Two matches in this session are called Match ${row.match}. Rename one in the app.` });
    }
  });
  // Neither of them is the one a row means, so the planner must not compare a row with either.
  for (const key of twice) {
    savedMatches.delete(key);
    heldIdOf.delete(key);
  }

  // Videos the actor already has. Where one is decides what its row does (see classifyKnownVideos).
  const keys = rows.map((row) => sourceKeyOf(row.videoUrl));
  const have = keys.some(Boolean)
    ? await db
        .selectFrom("videos")
        .select(["id", "source_key"])
        .where("created_by", "=", actor.accountId)
        .where("source_key", "in", unique(keys.filter((k): k is string => k !== null)))
        .orderBy("created_at")
        .execute()
    : [];
  const videoOfKey = new Map<string, string>();
  for (const v of have) if (v.source_key && !videoOfKey.has(v.source_key)) videoOfKey.set(v.source_key, v.id);
  const videoIds = [...videoOfKey.values()];
  const gamesOfVideos = videoIds.length
    ? await db
        .selectFrom("video_games")
        .innerJoin("match_games", "match_games.id", "video_games.match_game_id")
        .innerJoin("matches", "matches.id", "match_games.match_id")
        .innerJoin("sessions", "sessions.id", "matches.session_id")
        .select([
          "video_games.video_id",
          "match_games.game_number",
          "matches.label as match_label",
          "sessions.id as session_id",
          "sessions.label as session_label",
          "sessions.date",
        ])
        .where("video_games.video_id", "in", videoIds)
        .execute()
    : [];
  const poolsOfVideos = videoIds.length ? await db.selectFrom("video_sessions").select(["video_id", "session_id"]).where("video_id", "in", videoIds).execute() : [];
  const known = new Map<number, KnownVideo>();
  keys.forEach((key, row) => {
    const id = key ? videoOfKey.get(key) : undefined;
    if (id === undefined) return;
    known.set(row, {
      id,
      games: gamesOfVideos
        .filter((g) => g.video_id === id)
        .map((g) => ({ sessionId: g.session_id, sessionLabel: g.session_label, date: String(g.date).slice(0, 10), matchLabel: g.match_label, gameNumber: g.game_number })),
      pools: poolsOfVideos.filter((l) => l.video_id === id).map((l) => l.session_id),
    });
  });
  const classified = classifyKnownVideos(rows, known, (row) => existing.get(sessionKey(row.date, sessionLabelOf(row))));
  issues.push(...classified.issues);
  const skipped: ImportReport["skipped"] = [...classified.skip].sort((a, b) => a - b).map((row) => ({ row, reason: "You already have this video" }));

  const plan = planImport(rows, classified.skip, new Set(merged.people.map(({ person }) => person.name)), savedMatches);
  issues.push(...plan.issues);
  if (issues.length) throw new Failure("VALIDATION", issues);

  // Guests first, so every name has an account.
  const accountOf = new Map<string, string>();
  const newGuests: { id: string; displayName: string; handle: string; person: number }[] = [];
  const used = new Set(plan.sessions.flatMap((s) => s.matches.flatMap((m) => [...m.sides[0], ...m.sides[1]])));
  merged.people.forEach(({ person: p, index: person }) => {
    if (!used.has(p.name)) return;
    if (p.accountId) accountOf.set(p.name, p.accountId);
    else if (p.guest) {
      const id = randomUUID();
      accountOf.set(p.name, id);
      newGuests.push({ id, displayName: p.guest.displayName, handle: p.guest.handle, person });
    }
  });
  await located(
    () => saveGuests.within(ctx, newGuests.map(({ id, displayName, handle }) => ({ id, displayName, handle }))),
    (item) => ["people", newGuests[item].person, "guest"],
  );

  // Sessions, matches and what hangs off them, in file order. Each record keeps the row it came from.
  const sessionBatch = batchOf<Parameters<typeof saveSessions.within>[1]>();
  const matchBatch = batchOf<Parameters<typeof saveMatches.within>[1]>();
  const teamBatch = batchOf<Parameters<typeof saveTeams.within>[1]>();
  const playerBatch = batchOf<Parameters<typeof saveMatchPlayers.within>[1]>();
  const gameBatch = batchOf<Parameters<typeof saveGames.within>[1]>();
  const scoreBatch = batchOf<Parameters<typeof saveGameScores.within>[1]>();
  const videoBatch = batchOf<Parameters<typeof saveVideos.within>[1]>();
  const gameLinkBatch = batchOf<Parameters<typeof saveVideoGames.within>[1]>();
  const poolLinkBatch = batchOf<Parameters<typeof saveVideoSessions.within>[1]>();
  const report: ImportReport["sessions"] = [];
  let newMatches = 0;

  /** The video of a row. One the actor already has is linked again. Any other is made. */
  const videoOf = (row: number) => {
    const saved = classified.reuse.get(row);
    if (saved !== undefined) return saved;
    const id = randomUUID();
    videoBatch.add(row, { id, label: rows[row].label, videoUrl: rows[row].videoUrl });
    return id;
  };

  for (const planned of plan.sessions) {
    const heldSession = existing.get(sessionKey(planned.date, planned.label));
    const sessionId = heldSession ?? randomUUID();
    if (!heldSession) sessionBatch.add(planned.row, { id: sessionId, label: planned.label, date: planned.date, timezone: input.timezone });

    // A game on its own goes after the last "Game <n>" the session has.
    let gameNumber = 0;
    for (const m of heldMatches.filter((h) => h.session_id === heldSession)) {
      gameNumber = Math.max(gameNumber, Number(/^Game (\d+)$/.exec(m.label)?.[1] ?? 0));
    }

    for (const match of planned.matches) {
      const firstRow = match.games[0].row;
      const saved = match.key === null ? undefined : heldIdOf.get(heldKey(planned.date, planned.label, match.key));
      const matchId = saved?.id ?? randomUUID();
      const label = match.key === null ? `Game ${++gameNumber}` : `Match ${match.key}`;
      // A saved match is written again only to change its format. Its place in the session stays.
      if (!saved || match.format !== savedMatches.get(heldKey(planned.date, planned.label, match.key!))?.format) {
        matchBatch.add(firstRow, { id: matchId, sessionId, label, matchType: match.matchType, format: match.format });
      }
      if (!saved) newMatches += 1;

      const teams = saved
        ? saved.teams
        : match.sides.map((names, side) => {
            const teamId = randomUUID();
            teamBatch.add(firstRow, { id: teamId, matchId, label: `Team ${side + 1}` });
            for (const name of names) playerBatch.add(firstRow, { matchTeamId: teamId, accountId: accountOf.get(name)! });
            return teamId;
          });

      for (const game of match.games) {
        const gameId = randomUUID();
        gameBatch.add(game.row, { id: gameId, matchId, gameNumber: game.number });
        game.scores?.forEach((score, side) => scoreBatch.add(game.row, { matchTeamId: teams[side], matchGameId: gameId, score }));

        gameLinkBatch.add(game.row, { videoId: videoOf(game.row), matchGameId: gameId });
      }
    }

    // Rows with no game: a video in the session's pool and nothing else.
    for (const row of planned.videos) poolLinkBatch.add(row, { videoId: videoOf(row), sessionId });

    report.push({
      label: planned.label,
      date: planned.date,
      existing: heldSession !== undefined,
      matches: planned.matches.length,
      games: planned.matches.reduce((n, m) => n + m.games.length, 0),
      videos: planned.videos.length,
    });
  }

  await located(() => saveSessions.within(ctx, sessionBatch.items), sessionBatch.locate);
  await located(() => saveMatches.within(ctx, matchBatch.items), matchBatch.locate);
  await located(() => saveTeams.within(ctx, teamBatch.items), teamBatch.locate);
  await located(() => saveMatchPlayers.within(ctx, playerBatch.items), playerBatch.locate);
  await located(() => saveGames.within(ctx, gameBatch.items), gameBatch.locate);
  await located(() => saveGameScores.within(ctx, scoreBatch.items), scoreBatch.locate);
  await located(() => saveVideos.within(ctx, videoBatch.items), videoBatch.locate);
  await located(() => saveVideoGames.within(ctx, gameLinkBatch.items), gameLinkBatch.locate);
  await located(() => saveVideoSessions.within(ctx, poolLinkBatch.items), poolLinkBatch.locate);

  const result: ImportReport = {
    dryRun: input.dryRun === true,
    sessions: report,
    created: {
      sessions: sessionBatch.items.length,
      matches: newMatches,
      games: gameBatch.items.length,
      videos: videoBatch.items.length,
      unlinked: poolLinkBatch.items.length,
      guests: newGuests.length,
    },
    skipped,
    newGuests: newGuests.map(({ id, handle }) => ({ handle, accountId: id })),
  };
  if (input.dryRun) throw new Rollback(result);
  return result;
});
