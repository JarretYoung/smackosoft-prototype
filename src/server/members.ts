import { sql } from "kysely";
import { RemoveMembersInput, SaveMembersInput } from "../contract";
import { matchesPairs, requireRole, rolesIn } from "./access";
import { expectAll, stop, write } from "./core";

const key = (m: { sessionId: string; accountId: string }) => `${m.sessionId}:${m.accountId}`;

export const saveMembers = write(SaveMembersInput, async ({ db, actor }, items) => {
  const roles = await rolesIn(db, actor, items.map((m) => m.sessionId));
  const current = await db
    .selectFrom("session_access")
    .select(["session_id", "account_id", "role_type"])
    .where(matchesPairs(items))
    .execute();
  const currentRole = new Map(current.map((r) => [`${r.session_id}:${r.account_id}`, r.role_type]));

  items.forEach((member, index) => {
    requireRole(roles, member.sessionId, "MANAGER", [index, "sessionId"]);
    const existing = currentRole.get(key(member));
    if (existing === "OWNER") stop("CONFLICT", [index, "accountId"], "The owner cannot be changed");
    // Granting or changing the manager role is the owner's call.
    if (member.role === "MANAGER" || existing === "MANAGER") {
      requireRole(roles, member.sessionId, "OWNER", [index, "role"]);
    }
  });

  const written = await db
    .insertInto("session_access")
    .values(
      items.map((m) => ({
        session_id: m.sessionId,
        account_id: m.accountId,
        role_type: m.role,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .columns(["session_id", "account_id"])
        .doUpdateSet((eb) => ({
          role_type: eb.ref("excluded.role_type"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        .where("session_access.role_type", "<>", "OWNER"),
    )
    .returning(["session_id", "account_id"])
    .execute();
  expectAll(
    items,
    new Set(written.map((r) => `${r.session_id}:${r.account_id}`)),
    key,
    "The owner cannot be changed",
  );
});

export const removeMembers = write(RemoveMembersInput, async ({ db, actor }, items) => {
  const isSelf = (member: { accountId: string }) => member.accountId === actor.accountId;
  const roles = await rolesIn(db, actor, items.map((m) => m.sessionId));
  const visible = items
    .map((member, index) => ({ member, index }))
    .filter(({ member, index }) => {
      if (!roles.has(member.sessionId)) return false;
      // Anyone may remove themselves. Removing someone else takes MANAGER.
      requireRole(roles, member.sessionId, isSelf(member) ? "VIEWER" : "MANAGER", [index, "sessionId"]);
      return true;
    });
  if (!visible.length) return;

  const current = await db
    .selectFrom("session_access")
    .select(["session_id", "account_id", "role_type"])
    .where(matchesPairs(visible.map((v) => v.member)))
    .execute();
  const currentRole = new Map(current.map((r) => [`${r.session_id}:${r.account_id}`, r.role_type]));

  const players = await db
    .selectFrom("match_players")
    .innerJoin("match_teams", "match_teams.id", "match_players.match_team_id")
    .innerJoin("matches", "matches.id", "match_teams.match_id")
    .select(["matches.session_id as session_id", "match_players.account_id as account_id"])
    .where((eb) =>
      eb.or(
        visible.map(({ member }) =>
          eb.and([eb("matches.session_id", "=", member.sessionId), eb("match_players.account_id", "=", member.accountId)]),
        ),
      ),
    )
    .execute();
  const playing = new Set(players.map((p) => `${p.session_id}:${p.account_id}`));

  visible.forEach(({ member, index }) => {
    const existing = currentRole.get(key(member));
    if (existing === "OWNER") stop("CONFLICT", [index, "accountId"], "The owner cannot be removed");
    if (existing === "MANAGER" && !isSelf(member)) requireRole(roles, member.sessionId, "OWNER", [index, "accountId"]);
    if (playing.has(key(member))) stop("CONFLICT", [index, "accountId"], "Still a player. Remove the player first");
  });

  await db.deleteFrom("session_access").where(matchesPairs(visible.map((v) => v.member))).execute();
});
