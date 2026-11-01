/**
 * Starts one disposable Postgres for the whole run and applies every migration.
 * Tests get the connection strings through `inject`.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    /** Superuser. Used to seed auth users and to inspect rows. */
    adminUrl: string;
    /** The smackosoft_service role. Used by the code under test. */
    serviceUrl: string;
  }
}

const migrationsDir = path.resolve(import.meta.dirname, "../../supabase/migrations");

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:17").start();
  const adminUrl = container.getConnectionUri();

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  // Stand-in for Supabase's auth schema. The migrations only need auth.users(id).
  await admin.query("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);");
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await admin.query(readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  await admin.query("ALTER ROLE smackosoft_service WITH PASSWORD 'test'");
  await admin.end();

  const service = new URL(adminUrl);
  service.username = "smackosoft_service";
  service.password = "test";

  project.provide("adminUrl", adminUrl);
  project.provide("serviceUrl", service.toString());

  return async () => {
    await container.stop();
  };
}
