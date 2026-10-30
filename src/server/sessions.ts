import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import {
  GetSessionInput,
  ListSessionsInput,
  RemoveSessionsInput,
  SaveSessionsInput,
  type Match,
  type Member,
  type SessionDetails,
  type SessionListItem,
} from "../contract";
import { removableOnParents, requireRole, rolesIn } from "./access";
import { accountColumns, toAccount } from "./queries/accounts";
import { sessionsOfSessions } from "./queries/parents";
import { expectAll, read, stop, write } from "./core";
import type { Db } from "./db/client";
import { removeSessionRows } from "./remove";

// ------------------------------------------------------------------ shared

const isoOrNull = (time: Date | null) => (time ? time.toISOString() : null);

/** Members of the given sessions, in the order they were added. */
async function loadMembers(db: Db, sessionIds: string[]): Promise<Map<string, Member[]>> {
  const bySession = new Map<string, Member[]>();
  if (!sessionIds.length) return bySession;
  const rows = await db
    .selectFrom("session_access")
    .innerJoin("accounts", "accounts.id", "session_access.account_id")
    .select((eb) => [
      ...accountColumns,
      "session_access.session_id",
      "session_access.role",
      eb
        .exists(
          eb
            .selectFrom("match_players")
            .innerJoin("match_teams", "match_teams.id", "match_players.match_team_id")
            .innerJoin("matches", "matches.id", "match_teams.match_id")
            .select(sql.lit(1).as("one"))
            .whereRef("match_players.account_id", "=", "session_access.account_id")
            .whereRef("matches.session_id", "=", "session_access.session_id"),
        )
        .as("is_player"),
    ])
    .where("session_access.session_id", "in", sessionIds)
    .orderBy("session_access.created_at")
    .execute();
  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push({ ...toAccount(row), role: row.role, isPlayer: Boolean(row.is_player) });
    bySession.set(row.session_id, list);
  }
  return bySession;
}

// ------------------------------------------------------------------- saves

export const saveSessions = write(SaveSessionsInput, async ({ db, actor }, items) => {
  const existing = await db
    .selectFrom("sessions")
    .select("id")
    .where("id", "in", items.map((s) => s.id))
    .execute();
  const existingIds = new Set(existing.map((r) => r.id));

  // An existing id the actor cannot see is taken by someone else: CONFLICT, no details.
  const roles = await rolesIn(db, actor, [...existingIds]);
  items.forEach((session, index) => {
    if (!existingIds.has(session.id)) return;
    if (!roles.has(session.id)) stop("CONFLICT", [index, "id"], "Id already used");
    requireRole(roles, session.id, "MANAGER", [index, "id"]);
  });

  const written = await db
    .insertInto("sessions")
    .values(
      items.map((s) => ({
        id: s.id,
        label: s.label,
        date: s.date,
        timezone: s.timezone,
        location: s.location ?? null,
        location_url: s.locationUrl ?? null,
        latitude: s.latitude ?? null,
        longitude: s.longitude ?? null,
        start_time: s.startTime ?? null,
        end_time: s.endTime ?? null,
        cover_url: s.coverUrl ?? null,
        court_fee: s.courtFee ?? null,
        currency: s.currency ?? null,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          label: eb.ref("excluded.label"),
          date: eb.ref("excluded.date"),
          timezone: eb.ref("excluded.timezone"),
          location: eb.ref("excluded.location"),
          location_url: eb.ref("excluded.location_url"),
          latitude: eb.ref("excluded.latitude"),
          longitude: eb.ref("excluded.longitude"),
          start_time: eb.ref("excluded.start_time"),
          end_time: eb.ref("excluded.end_time"),
          cover_url: eb.ref("excluded.cover_url"),
          court_fee: eb.ref("excluded.court_fee"),
          currency: eb.ref("excluded.currency"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        // Backstop for the checks above: only a manager or owner may overwrite.
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("session_access")
              .select(sql.lit(1).as("one"))
              .whereRef("session_access.session_id", "=", "sessions.id")
              .where("session_access.account_id", "=", actor.accountId)
              .where("session_access.role", "in", ["MANAGER", "OWNER"]),
          ),
        ),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (s) => s.id, "Id already used");

  // The creator owns what they create. Only on insert.
  const created = items.filter((s) => !existingIds.has(s.id));
  if (created.length) {
    await db
      .insertInto("session_access")
      .values(
        created.map((s) => ({
          session_id: s.id,
          account_id: actor.accountId,
          role: "OWNER" as const,
          created_by: actor.accountId,
        })),
      )
      .execute();
  }
});

export const removeSessions = write(RemoveSessionsInput, async ({ db, actor }, sessionIds) => {
  const visible = await removableOnParents(db, actor, sessionIds, (id) => id, sessionsOfSessions(sessionIds), "OWNER");
  await removeSessionRows(db, visible);
});

// ------------------------------------------------------------------- reads

/** First day of last month through last day of next month, in UTC. */
function defaultWindow() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: day(new Date(Date.UTC(year, month - 1, 1))),
    to: day(new Date(Date.UTC(year, month + 2, 0))),
  };
}

export const listSessions = read(ListSessionsInput, async ({ db, actor }, input) => {
  const window = defaultWindow();
  const from = input?.from ?? window.from;
  const to = input?.to ?? window.to;

  const sessions = await db
    .selectFrom("sessions")
    .innerJoin("session_access", "session_access.session_id", "sessions.id")
    .select([
      "sessions.id",
      "sessions.label",
      "sessions.date",
      "sessions.timezone",
      "sessions.start_time",
      "sessions.end_time",
      "sessions.location",
      "sessions.cover_url",
      "session_access.role",
    ])
    .where("session_access.account_id", "=", actor.accountId)
    .where("sessions.date", ">=", from)
    .where("sessions.date", "<=", to)
    .orderBy("sessions.date")
    // Within a day, the one that starts first comes first. A session with no start goes last.
    .orderBy("sessions.start_time", (ob) => ob.asc().nullsLast())
    .orderBy("sessions.created_at")
    .execute();
  if (!sessions.length) return [];

  const ids = sessions.map((s) => s.id);
  const members = await loadMembers(db, ids);
  const counts = await db
    .selectFrom("matches")
    .select(["session_id", (eb) => eb.fn.countAll<string>().as("count")])
    .where("session_id", "in", ids)
    .groupBy("session_id")
    .execute();
  const matchCount = new Map(counts.map((c) => [c.session_id, Number(c.count)]));

  return sessions.map(
    (s): SessionListItem => ({
      id: s.id,
      label: s.label,
      date: s.date,
      timezone: s.timezone,
      startTime: isoOrNull(s.start_time),
      endTime: isoOrNull(s.end_time),
      location: s.location,
      coverUrl: s.cover_url,
      matchCount: matchCount.get(s.id) ?? 0,
      myRole: s.role,
      members: members.get(s.id) ?? [],
    }),
  );
});

export const getSessionDetails = read(GetSessionInput, async ({ db, actor }, { sessionId }): Promise<SessionDetails> => {
  const roles = await rolesIn(db, actor, [sessionId]);
  requireRole(roles, sessionId, "VIEWER", ["sessionId"]);

  // One query for the whole match tree. JSON timestamps arrive as strings, hence `new Date`.
  const session = await db
    .selectFrom("sessions")
    .select((eb) => [
      "sessions.id",
      "sessions.label",
      "sessions.date",
      "sessions.timezone",
      "sessions.start_time",
      "sessions.end_time",
      "sessions.location",
      "sessions.location_url",
      "sessions.latitude",
      "sessions.longitude",
      "sessions.cover_url",
      "sessions.court_fee",
      "sessions.currency",
      jsonArrayFrom(
        eb
          .selectFrom("matches")
          .select((m) => [
            "matches.id",
            "matches.label",
            "matches.match_type",
            jsonArrayFrom(
              m
                .selectFrom("match_teams")
                .select((t) => [
                  "match_teams.id",
                  "match_teams.label",
                  jsonArrayFrom(
                    t
                      .selectFrom("match_players")
                      .innerJoin("accounts", "accounts.id", "match_players.account_id")
                      .select(accountColumns)
                      .whereRef("match_players.match_team_id", "=", "match_teams.id")
                      .orderBy("match_players.created_at"),
                  ).as("players"),
                ])
                .whereRef("match_teams.match_id", "=", "matches.id")
                .orderBy("match_teams.created_at"),
            ).as("teams"),
            jsonArrayFrom(
              m
                .selectFrom("match_games")
                .select((g) => [
                  "match_games.id",
                  "match_games.game_number",
                  "match_games.start_time",
                  "match_games.end_time",
                  jsonArrayFrom(
                    g
                      .selectFrom("match_game_scores")
                      .select(["match_game_scores.match_team_id", "match_game_scores.score"])
                      .whereRef("match_game_scores.match_game_id", "=", "match_games.id"),
                  ).as("scores"),
                  g
                    .selectFrom("video_games")
                    .select(g.fn.countAll<string>().as("count"))
                    .whereRef("video_games.match_game_id", "=", "match_games.id")
                    .as("video_count"),
                ])
                .whereRef("match_games.match_id", "=", "matches.id")
                .orderBy("match_games.game_number"),
            ).as("games"),
          ])
          .whereRef("matches.session_id", "=", "sessions.id")
          .orderBy("matches.created_at"),
      ).as("matches"),
    ])
    .where("sessions.id", "=", sessionId)
    .executeTakeFirstOrThrow();
  const members = (await loadMembers(db, [sessionId])).get(sessionId) ?? [];

  return {
    id: session.id,
    label: session.label,
    date: session.date,
    timezone: session.timezone,
    startTime: isoOrNull(session.start_time),
    endTime: isoOrNull(session.end_time),
    location: session.location,
    locationUrl: session.location_url,
    latitude: session.latitude,
    longitude: session.longitude,
    coverUrl: session.cover_url,
    courtFee: session.court_fee,
    currency: session.currency,
    myRole: roles.get(sessionId)!,
    members,
    matches: session.matches.map(
      (m): Match => ({
        id: m.id,
        label: m.label,
        matchType: m.match_type,
        teams: m.teams.map((t) => ({ id: t.id, label: t.label, players: t.players.map(toAccount) })),
        games: m.games.map((g) => ({
          id: g.id,
          gameNumber: g.game_number,
          startTime: new Date(g.start_time).toISOString(),
          endTime: new Date(g.end_time).toISOString(),
          scores: g.scores.map((s) => ({ matchTeamId: s.match_team_id, score: s.score })),
          videoCount: Number(g.video_count ?? 0),
        })),
      }),
    ),
  };
});
