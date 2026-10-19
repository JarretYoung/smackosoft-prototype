/**
 * Every use case returns a Result. Expected failures are values with a code.
 * Unexpected failures (bugs, database down) throw and reach the error boundary.
 */

export type ErrorCode =
  | "UNAUTHENTICATED" // no session. Redirect to login.
  | "NOT_FOUND" // missing, or the actor has no access to it
  | "FORBIDDEN" // visible, but the actor's role is too low
  | "VALIDATION" // bad input. See `issues`.
  | "CONFLICT"; // current state blocks the request. See `issues`.

/** Points at the input item that caused the error. Array indexes are included. */
export type Issue = {
  path: (string | number)[];
  message: string;
};

export type AppError = {
  code: ErrorCode;
  issues?: Issue[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

/** The result of a write. Nothing comes back on success. */
export type Ack = Result<void>;

export const ok =<T>(data: T): Result<T> => ({ ok: true, data });

export const fail = (code: ErrorCode, issues?: Issue[]): Result<never> => ({
  ok: false,
  error: issues ? { code, issues } : { code },
});
