import { expect } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

type Found = { messages?: { ID: string }[] };
type Message = { Text?: string; HTML?: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT}${path}`);
  if (!response.ok) throw new Error(`Mailpit answered ${response.status} for ${path}`);
  return (await response.json()) as T;
}

/**
 * The link in the newest email to `email` with this subject. It waits for the email to arrive.
 * Endpoints: GET /api/v1/search?query=to:<address> subject:"<subject>", then GET /api/v1/message/<ID>.
 * https://mailpit.axllent.org/docs/api-v1/
 */
async function linkFor(email: string, subject: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const query = `to:${email} subject:"${subject}"`;
        const found = await getJson<Found>(`/api/v1/search?query=${encodeURIComponent(query)}`);
        const id = found.messages?.[0]?.ID;
        if (!id) return "";
        const message = await getJson<Message>(`/api/v1/message/${id}`);
        const match = `${message.Text ?? ""}\n${message.HTML ?? ""}`.match(/https?:\/\/[^\s"'<>)]*\/auth\/confirm\?[^\s"'<>)]*/);
        link = match ? match[0].replaceAll("&amp;", "&") : "";
        return link;
      },
      { message: `No "${subject}" email for ${email} in Mailpit`, timeout: 20_000 },
    )
    .not.toBe("");
  return link;
}

/** The link in the sign-up email. See supabase/templates/confirmation.html. */
export const confirmationLinkFor = (email: string) => linkFor(email, "Confirm your email");

/** The link in the password reset email. See supabase/templates/recovery.html. */
export const resetLinkFor = (email: string) => linkFor(email, "Reset your password");
