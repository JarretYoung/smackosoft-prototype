import type { AppError } from "@/src/contract";

const FALLBACK: Record<AppError["code"], string> = {
  UNAUTHENTICATED: "Please sign in again.",
  NOT_FOUND: "That could not be found.",
  FORBIDDEN: "You do not have permission to do that.",
  VALIDATION: "Some of the details are not valid.",
  CONFLICT: "That clashes with what is already saved.",
};

/** One line for a toast. Prefers the first message the backend gave. */
export function errorMessage(error: AppError): string {
  return error.issues?.[0]?.message ?? FALLBACK[error.code];
}

/** Messages keyed by the first path segment. Fits forms that save a single object. */
export function fieldErrors(error: AppError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues ?? []) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
