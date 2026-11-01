import { z } from "zod";
import type { AppError } from "../contract";
import { fieldErrors } from "./errors";

/** The first readable message in a field's error list. Entries are strings or issues with a message. */
export function firstMessage(errors: readonly unknown[]): string | undefined {
  for (const entry of errors) {
    if (typeof entry === "string" && entry) return entry;
    if (typeof entry === "object" && entry !== null && "message" in entry) {
      const message = (entry as { message: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  }
  return undefined;
}

/**
 * Sort a failed Result into messages for fields this form has and a flag for the rest.
 * `unmatched` is true when nothing in the error points at one of `fields`, so the caller must
 * still say something, in a toast or under a chosen field.
 */
export function splitServerErrors(
  error: AppError,
  fields: readonly string[],
): { matched: Record<string, string>; unmatched: boolean } {
  const matched = Object.fromEntries(Object.entries(fieldErrors(error)).filter(([key]) => fields.includes(key)));
  return { matched, unmatched: Object.keys(matched).length === 0 };
}

/** A string schema built from a "problem" function that returns a message, or undefined when the value is fine. */
export function fromProblem(problem: (value: string) => string | undefined) {
  return z.string().refine((value) => !problem(value), { error: (issue) => problem(String(issue.input)) });
}
