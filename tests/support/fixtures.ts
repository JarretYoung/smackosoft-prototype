/**
 * Test fixtures. Every test gets its own people and ids, so tests do not share state,
 * need no cleanup and can run in any order.
 *
 * - `app`    (per file) the server modules wired to the test database
 * - `admin`  (per file) a superuser connection for seeding and inspecting rows
 * - `world`  (per test) three fresh accounts and a way to act as each of them
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { inject, test as base } from "vitest";
import { ok } from "./helpers";

export const id = randomUUID;

export type Person = { user: string; accountId: string; handle: string };

export const test = base
  .extend("admin", { scope: "file" }, async ({}, { onCleanup }) => {
    const client = new pg.Client({ connectionString: inject("adminUrl") });
    await client.connect();
    onCleanup(() => client.end());
    return client;
  })
  .extend("app", { scope: "file" }, async ({}, { onCleanup }) => {
    process.env.DATABASE_URL = inject("serviceUrl");
    const [{ backend }, core, client] = await Promise.all([
      import("../../src/server/index"),
      import("../../src/server/core"),
      import("../../src/server/db/client"),
    ]);
    onCleanup(() => client.closeDb());
    return { b: backend, authSource: core.authSource };
  })
  .extend("world", async ({ app, admin }, { onCleanup }) => {
    const original = app.authSource.userId;
    onCleanup(() => {
      app.authSource.userId = original;
    });

    const as = (who: { user: string }) => {
      app.authSource.userId = async () => who.user;
    };
    /** A signed-in user with no account yet. */
    const newUser = async () => {
      const user = id();
      await admin.query("insert into auth.users (id) values ($1)", [user]);
      return { user };
    };
    const person = async (name: string): Promise<Person> => {
      const { user } = await newUser();
      const handle = `${name}_${id().replace(/-/g, "").slice(0, 10)}`;
      as({ user });
      ok(await app.b.accounts.saveCurrent({ displayName: name, handle }));
      const { account } = ok(await app.b.accounts.getCurrent());
      return { user, accountId: account.id, handle };
    };

    const owner = await person("owner");
    const mate = await person("mate");
    const stranger = await person("stranger");
    as(owner);
    return { b: app.b, as, newUser, person, owner, mate, stranger, admin };
  });
