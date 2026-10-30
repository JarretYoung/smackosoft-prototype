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
 * The confirmation link from the sign-up email sent to `email`. It waits for the email to arrive.
 * Endpoints: GET /api/v1/search?query=to:<address>, then GET /api/v1/message/<ID>.
 * https://mailpit.axllent.org/docs/api-v1/
 */
export async function confirmationLinkFor(email: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const found = await getJson<Found>(`/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
        const id = found.messages?.[0]?.ID;
        if (!id) return "";
        const message = await getJson<Message>(`/api/v1/message/${id}`);
        const match = `${message.Text ?? ""}\n${message.HTML ?? ""}`.match(/https?:\/\/[^\s"'<>)]*\/auth\/confirm\?[^\s"'<>)]*/);
        link = match ? match[0].replaceAll("&amp;", "&") : "";
        return link;
      },
      { message: `No sign-up email for ${email} in Mailpit`, timeout: 20_000 },
    )
    .not.toBe("");
  return link;
}
