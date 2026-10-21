import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "kysely";
import {
  ClaimInput,
  CreateClaimInput,
  FindAccountByHandleInput,
  RemoveGuestsInput,
  SaveCurrentAccountInput,
  SaveGuestsInput,
  type Account,
  type CurrentAccount,
  type Guest,
} from "../contract";
import { act, authSource, expectAll, Failure, guard, NoInput, parse, read, stop, write } from "./core";
import { getDb, type Db } from "./db/client";

const HANDLE_CHANGES_ALLOWED = 2;

type AccountRow = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  account_type: "GUEST" | "STANDARD";
};

export const accountColumns = [
  "accounts.id",
  "accounts.display_name",
  "accounts.handle",
  "accounts.avatar_url",
  "accounts.account_type",
] as const;

export const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  displayName: row.display_name,
  handle: row.handle,
  avatarUrl: row.avatar_url,
  isGuest: row.account_type === "GUEST",
});

/**
 * Handles are unique among live accounts. The unique index is the real guard.
 * This check exists so the error can point at the item that clashed.
 */
async function assertHandlesFree(
  db: Db,
  entries: { handle: string; selfId?: string; path: (string | number)[] }[],
) {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.handle)) stop("CONFLICT", entry.path, "Handle repeated in this call");
    seen.add(entry.handle);
  }
  const taken = await db
    .selectFrom("accounts")
    .select(["id", "handle"])
    .where("handle", "in", entries.map((e) => e.handle))
    .where("deleted", "=", false)
    .execute();
  for (const entry of entries) {
    if (taken.some((row) => row.handle === entry.handle && row.id !== entry.selfId)) {
      stop("CONFLICT", entry.path, "Handle already taken");
    }
  }
}

export const getCurrentAccount = read(NoInput, async ({ db, actor }): Promise<CurrentAccount> => {
  const row = await db
    .selectFrom("accounts")
    .select([...accountColumns, "accounts.handle_change_count"])
    .where("accounts.id", "=", actor.accountId)
    .executeTakeFirstOrThrow();
  return {
    account: toAccount(row),
    handleChangesLeft: HANDLE_CHANGES_ALLOWED - row.handle_change_count,
  };
});

export const findAccountByHandle = read(FindAccountByHandleInput, async ({ db }, { handle }) => {
  const row = await db
    .selectFrom("accounts")
    .select(accountColumns)
    .where("handle", "=", handle)
    .where("deleted", "=", false)
    .executeTakeFirst();
  return row ? toAccount(row) : null;
});

/** The only use case that works without an account. It creates the account on first call. */
export const saveCurrentAccount = (input: unknown) =>
  guard(async () => {
    const { displayName, handle } = parse(SaveCurrentAccountInput, input);
    const userId = await authSource.userId();
    if (!userId) throw new Failure("UNAUTHENTICATED");

    await getDb()
      .transaction()
      .execute(async (tx) => {
        const existing = await tx
          .selectFrom("accounts")
          .select(["id", "handle", "handle_change_count"])
          .where("user_id", "=", userId)
          .where("deleted", "=", false)
          .executeTakeFirst();
        await assertHandlesFree(tx, [{ handle, selfId: existing?.id, path: ["handle"] }]);

        if (!existing) {
          const id = randomUUID();
          await tx
            .insertInto("accounts")
            .values({ id, user_id: userId, display_name: displayName, handle, created_by: id })
            .execute();
          return;
        }
        // One conditional statement, so two parallel saves cannot both spend the last change.
        const updated = await tx
          .updateTable("accounts")
          .set({
            display_name: displayName,
            handle,
            handle_change_count: sql`handle_change_count + case when handle <> ${handle} then 1 else 0 end`,
            updated_at: sql`now()`,
            updated_by: existing.id,
          })
          .where("id", "=", existing.id)
          .where((eb) =>
            eb.or([eb("handle", "=", handle), eb("handle_change_count", "<", HANDLE_CHANGES_ALLOWED)]),
          )
          .returning("id")
          .executeTakeFirst();
        if (!updated) stop("CONFLICT", ["handle"], "No handle changes left");
      });
  });

export const saveGuests = write(SaveGuestsInput, async ({ db, actor }, items) => {
  const existing = await db
    .selectFrom("accounts")
    .select(["id", "handle", "handle_change_count", "account_type", "created_by"])
    .where("id", "in", items.map((g) => g.id))
    .execute();
  const byId = new Map(existing.map((row) => [row.id, row]));

  items.forEach((guest, index) => {
    const row = byId.get(guest.id);
    if (!row) return;
    if (row.account_type !== "GUEST" || row.created_by !== actor.accountId) {
      stop("CONFLICT", [index, "id"], "Id already used");
    }
    if (row.handle !== guest.handle && row.handle_change_count >= HANDLE_CHANGES_ALLOWED) {
      stop("CONFLICT", [index, "handle"], "No handle changes left");
    }
  });
  await assertHandlesFree(
    db,
    items.map((g, index) => ({ handle: g.handle, selfId: g.id, path: [index, "handle"] })),
  );

  const written = await db
    .insertInto("accounts")
    .values(
      items.map((g) => ({
        id: g.id,
        account_type: "GUEST" as const,
        display_name: g.displayName,
        handle: g.handle,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          display_name: eb.ref("excluded.display_name"),
          handle: eb.ref("excluded.handle"),
          handle_change_count: sql`case when accounts.handle <> excluded.handle then accounts.handle_change_count + 1 else accounts.handle_change_count end`,
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        // Backstop for the checks above, and for a parallel save that spends the last handle change.
        .where((eb) =>
          eb.and([
            eb("accounts.account_type", "=", "GUEST"),
            eb("accounts.created_by", "=", actor.accountId),
            eb.or([
              eb("accounts.handle", "=", eb.ref("excluded.handle")),
              eb("accounts.handle_change_count", "<", HANDLE_CHANGES_ALLOWED),
            ]),
          ]),
        ),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (g) => g.id, "Id already used");
});

export const listGuests = read(NoInput, async ({ db, actor }): Promise<Guest[]> => {
  const rows = await db
    .selectFrom("accounts")
    .select([...accountColumns, "accounts.claim_token"])
    .where("accounts.created_by", "=", actor.accountId)
    .where("accounts.account_type", "=", "GUEST")
    .where("accounts.deleted", "=", false)
    .orderBy("accounts.display_name")
    .execute();
  return rows.map((row) => ({ ...toAccount(row), hasClaimCode: row.claim_token !== null }));
});

/** Soft delete. Other people's guests and unknown ids are skipped, so a replay is safe. */
export const removeGuests = write(RemoveGuestsInput, async ({ db, actor }, ids) => {
  await db
    .updateTable("accounts")
    .set({ deleted: true, claim_token: null, updated_at: sql`now()`, updated_by: actor.accountId })
    .where("id", "in", ids)
    .where("account_type", "=", "GUEST")
    .where("created_by", "=", actor.accountId)
    .where("deleted", "=", false)
    .execute();
});

export const createGuestClaim = act(CreateClaimInput, async ({ db, actor }, { guestId }) => {
  const token = randomBytes(12).toString("base64url");
  const updated = await db
    .updateTable("accounts")
    .set({ claim_token: token, updated_at: sql`now()`, updated_by: actor.accountId })
    .where("id", "=", guestId)
    .where("account_type", "=", "GUEST")
    .where("created_by", "=", actor.accountId)
    .where("deleted", "=", false)
    .returning("id")
    .executeTakeFirst();
  if (!updated) stop("NOT_FOUND", ["guestId"], "Not found");
  return { token };
});

/** Works without an account. The guest row becomes the user's account, so its history comes along. */
export const claimGuest = (input: unknown) =>
  guard(async () => {
    const { token } = parse(ClaimInput, input);
    const userId = await authSource.userId();
    if (!userId) throw new Failure("UNAUTHENTICATED");

    await getDb()
      .transaction()
      .execute(async (tx) => {
        const own = await tx.selectFrom("accounts").select("id").where("user_id", "=", userId).executeTakeFirst();
        if (own) stop("CONFLICT", ["token"], "You already have an account");

        const claimed = await tx
          .updateTable("accounts")
          .set({
            user_id: userId,
            account_type: "STANDARD",
            claim_token: null,
            updated_at: sql`now()`,
            updated_by: sql`id`,
          })
          .where("claim_token", "=", token)
          .where("account_type", "=", "GUEST")
          .where("deleted", "=", false)
          .returning("id")
          .executeTakeFirst();
        if (!claimed) stop("NOT_FOUND", ["token"], "That code is not valid");
      });
  });
