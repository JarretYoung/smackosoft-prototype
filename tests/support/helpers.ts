import type { Result } from "../../src/contract";

/** Unwraps an ok result. Fails the test with the error code otherwise. */
export function ok<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Expected ok, got ${result.error.code} ${JSON.stringify(result.error.issues ?? [])}`);
  }
  return result.data;
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
