import { randomUUID } from "node:crypto";
import { ImportGamesInput, type ImportReport, type Issue } from "../contract";
import { sourceKeyOf } from "../lib/video-source";
import { act, Failure, Rollback, unique, type Ctx } from "./core";
import { heldKey, planImport, type HeldMatch } from "./import-plan";
import { saveGuests } from "./accounts";
import { saveGameScores, saveGames, saveMatchPlayers, saveMatches, saveTeams } from "./matches";
import { saveSessions } from "./sessions";
import { saveVideoGames, saveVideos } from "./videos";

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

export const importGames = act(ImportGamesInput, async (ctx: Ctx, input): Promise<ImportReport> => {
  const { db, actor } = ctx;
  const { rows } = input;

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

  // Rows whose video the actor already has are left out.
  const keys = rows.map((row) => sourceKeyOf(row.videoUrl));
  const have = keys.some(Boolean)
    ? await db
        .selectFrom("videos")
        .select("source_key")
        .where("created_by", "=", actor.accountId)
        .where("source_key", "in", unique(keys.filter((k): k is string => k !== null)))
        .execute()
    : [];
  const owned = new Set(have.map((v) => v.source_key));
  const skipped: ImportReport["skipped"] = [];
  const skip = new Set<number>();
  keys.forEach((key, row) => {
    if (key && owned.has(key)) {
      skip.add(row);
      skipped.push({ row, reason: "You already have this video" });
    }
  });

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
  const heldGames = heldIds.length ? await db.selectFrom("match_games").select("match_id").where("match_id", "in", heldIds).execute() : [];
  const nameOf = new Map(input.people.flatMap((p) => (p.accountId ? [[p.accountId, p.name] as const] : [])));
  const idOfSession = new Map([...existing].map(([key, id]) => [id, key]));
  const savedMatches = new Map<string, HeldMatch>();
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
    savedMatches.set(key, { sides, games: heldGames.filter((g) => g.match_id === m.id).length, format: m.format });
    heldIdOf.set(key, { id: m.id, teams: teams.map((t) => t.id) });
  }

  const plan = planImport(rows, skip, new Set(input.people.map((p) => p.name)), savedMatches);
  issues.push(...plan.issues);
  if (issues.length) throw new Failure("VALIDATION", issues);

  // Guests first, so every name has an account.
  const accountOf = new Map<string, string>();
  const newGuests: { id: string; displayName: string; handle: string; person: number }[] = [];
  const used = new Set(plan.sessions.flatMap((s) => s.matches.flatMap((m) => [...m.sides[0], ...m.sides[1]])));
  input.people.forEach((p, person) => {
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

  // Sessions, matches and what hangs off them, in file order.
  const sessionRecords: Parameters<typeof saveSessions.within>[1] = [];
  const matchRecords: Parameters<typeof saveMatches.within>[1] = [];
  const teamRecords: Parameters<typeof saveTeams.within>[1] = [];
  const playerRecords: Parameters<typeof saveMatchPlayers.within>[1] = [];
  const gameRecords: Parameters<typeof saveGames.within>[1] = [];
  const scoreRecords: Parameters<typeof saveGameScores.within>[1] = [];
  const videoRecords: Parameters<typeof saveVideos.within>[1] = [];
  const gameLinks: Parameters<typeof saveVideoGames.within>[1] = [];
  const rowOfSession: number[] = [];
  const rowOfMatch: number[] = [];
  const rowOfTeam: number[] = [];
  const rowOfGame: number[] = [];
  const rowOfVideo: number[] = [];
  const rowOfPlayer: number[] = [];
  const rowOfScore: number[] = [];
  const createdVideos: ImportReport["videos"] = [];
  const report: ImportReport["sessions"] = [];
  let newMatches = 0;

  for (const planned of plan.sessions) {
    const heldSession = existing.get(sessionKey(planned.date, planned.label));
    const sessionId = heldSession ?? randomUUID();
    if (!heldSession) {
      sessionRecords.push({ id: sessionId, label: planned.label, date: planned.date, timezone: input.timezone });
      rowOfSession.push(planned.matches[0].games[0].row);
    }

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
        matchRecords.push({ id: matchId, sessionId, label, matchType: match.matchType, format: match.format });
        rowOfMatch.push(firstRow);
      }
      if (!saved) newMatches += 1;

      const teams = saved
        ? saved.teams
        : match.sides.map((names, side) => {
            const teamId = randomUUID();
            teamRecords.push({ id: teamId, matchId, label: `Team ${side + 1}` });
            rowOfTeam.push(firstRow);
            for (const name of names) {
              playerRecords.push({ matchTeamId: teamId, accountId: accountOf.get(name)! });
              rowOfPlayer.push(firstRow);
            }
            return teamId;
          });

      match.games.forEach((game, index) => {
        const gameId = randomUUID();
        gameRecords.push({ id: gameId, matchId, gameNumber: match.heldGames + index + 1 });
        rowOfGame.push(game.row);
        game.scores?.forEach((score, side) => {
          scoreRecords.push({ matchTeamId: teams[side], matchGameId: gameId, score });
          rowOfScore.push(game.row);
        });

        const videoId = randomUUID();
        videoRecords.push({ id: videoId, label: rows[game.row].label, videoUrl: rows[game.row].videoUrl });
        rowOfVideo.push(game.row);
        createdVideos.push({ id: videoId, label: rows[game.row].label, url: rows[game.row].videoUrl });
        gameLinks.push({ videoId, matchGameId: gameId });
      });
    }
    report.push({
      label: planned.label,
      date: planned.date,
      existing: heldSession !== undefined,
      matches: planned.matches.length,
      games: planned.matches.reduce((n, m) => n + m.games.length, 0),
    });
  }

  const at = (rowsOf: number[]) => (item: number): Path => ["rows", rowsOf[item]];
  await located(() => saveSessions.within(ctx, sessionRecords), at(rowOfSession));
  await located(() => saveMatches.within(ctx, matchRecords), at(rowOfMatch));
  await located(() => saveTeams.within(ctx, teamRecords), at(rowOfTeam));
  await located(() => saveMatchPlayers.within(ctx, playerRecords), at(rowOfPlayer));
  await located(() => saveGames.within(ctx, gameRecords), at(rowOfGame));
  await located(() => saveGameScores.within(ctx, scoreRecords), at(rowOfScore));
  await located(() => saveVideos.within(ctx, videoRecords), at(rowOfVideo));
  await located(() => saveVideoGames.within(ctx, gameLinks), at(rowOfVideo));

  const result: ImportReport = {
    dryRun: input.dryRun === true,
    sessions: report,
    created: {
      sessions: sessionRecords.length,
      matches: newMatches,
      games: gameRecords.length,
      videos: videoRecords.length,
      guests: newGuests.length,
    },
    skipped,
    videos: createdVideos,
  };
  if (input.dryRun) throw new Rollback(result);
  return result;
});
