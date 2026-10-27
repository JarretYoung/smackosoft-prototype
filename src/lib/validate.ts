import type { ZodType } from "zod";

/**
 * Check a form's values against its contract schema. Returns one message per field, keyed by the
 * first path segment. `copy` replaces the contract's wording, which is written for developers,
 * with a sentence that says what to do.
 */
export function validate(schema: ZodType, input: unknown, copy: Record<string, string> = {}): Record<string, string> {
  const checked = schema.safeParse(input);
  if (checked.success) return {};
  const out: Record<string, string> = {};
  for (const issue of checked.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = copy[key] ?? issue.message;
  }
  return out;
}

/**
 * Which messages to show. A field speaks up once the person has left it, and everything speaks
 * up after a failed submit. A message disappears the moment the value is fixed.
 */
export function visibleErrors(
  issues: Record<string, string>,
  touched: Record<string, boolean>,
  submitted: boolean,
): Record<string, string> {
  return Object.fromEntries(Object.entries(issues).filter(([key]) => submitted || touched[key]));
}
