import type pg from "pg";
import type { Result } from "../../src/contract";

/** Unwraps an ok result. Fails the test with the error code otherwise. */
export function ok<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Expected ok, got ${result.error.code} ${JSON.stringify(result.error.issues ?? [])}`);
  }
  return result.data;
}

/**
 * Starts `run` while another transaction holds a row lock, then releases the lock.
 * Calls that write to the locked row all reach the write before any of them can finish,
 * so a read-then-write race happens every time instead of by luck.
 */
export async function whileLocked<T>(
  admin: pg.Client,
  lockQuery: string,
  params: unknown[],
  run: () => Promise<T>,
): Promise<T> {
  await admin.query("begin");
  try {
    await admin.query(lockQuery, params);
    const running = run();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await admin.query("commit");
    return await running;
  } catch (error) {
    await admin.query("rollback").catch(() => {});
    throw error;
  }
}

/** The code, or "ok". Use for authorization tables. */
export const code = (result: Result<unknown>) => (result.ok ? "ok" : result.error.code);

/** The code and the input paths an error points at. Use to check a guard fired on the right item. */
export function failure(result: Result<unknown>) {
  if (result.ok) throw new Error("Expected a failure, got ok");
  return {
    code: result.error.code,
    paths: (result.error.issues ?? []).map((issue) => issue.path),
  };
}
