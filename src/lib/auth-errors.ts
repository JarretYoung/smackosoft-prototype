/**
 * Matches `minimum_password_length` and `password_requirements` (lower_upper_letters_digits)
 * in supabase/config.toml. Change them together.
 */
const MIN_PASSWORD = 8;

/** The rule in one sentence, for hints and errors. */
export const PASSWORD_RULE = `Use at least ${MIN_PASSWORD} characters with a lowercase letter, an uppercase letter and a number.`;

/** Shape check only. Supabase decides in the end. */
export const passwordProblem = (password: string): string | undefined =>
  password.length >= MIN_PASSWORD && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
    ? undefined
    : PASSWORD_RULE;

const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password do not match. Check them and try again.",
  user_already_exists: "There is already an account with that email. Try logging in instead.",
  email_exists: "There is already an account with that email. Try logging in instead.",
  weak_password: PASSWORD_RULE,
  same_password: "Choose a password you have not used before.",
  email_address_invalid: "That email address does not look right.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit: "Too many emails sent. Wait a minute and try again.",
};

/** A sentence for a sign-in failure: what went wrong and what to do. Never the raw provider text. */
export function authMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (MESSAGES[code]) return MESSAGES[code];
  if (error instanceof TypeError) return "Could not reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shape check only. The server decides whether the address works. */
export const emailProblem = (email: string): string | undefined =>
  EMAIL.test(email.trim()) ? undefined : "Enter your email address, like name@example.com";
