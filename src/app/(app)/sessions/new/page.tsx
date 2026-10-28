import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/components/session-form/session-form";
import { today } from "@/src/lib/format";
import { loadPeople } from "@/src/lib/people";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

/** The session this person last ran, newest first. Its details are what they most likely want again. */
async function lastSession() {
  const sessions = await backend.sessions.list().then(unwrap);
  const latest = sessions
    .filter((s) => s.myRole === "OWNER" && s.date <= today())
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? backend.sessions.get({ sessionId: latest.id }).then(unwrap) : null;
}

export default async function NewSessionPage() {
  const [me, people, last] = await Promise.all([
    backend.accounts.getCurrent().then(unwrap),
    loadPeople(),
    lastSession(),
  ]);
  return (
    <main>
      <PageHeader title="Create session" back="/sessions" />
      <SessionForm
        mode="create"
        viewerRole="OWNER"
        people={people}
        prefilledFrom={last?.date}
        initial={{
          // The client picks the id, so a retried save cannot create a second session.
          id: crypto.randomUUID(),
          label: "",
          date: today(),
          location: last?.location ?? "",
          locationUrl: last?.locationUrl ?? "",
          latitude: last?.latitude ?? null,
          longitude: last?.longitude ?? null,
          // Only the time of day and the length are reused. The form reads them in the browser's timezone.
          startTime: last?.startTime ?? "",
          endTime: last?.endTime ?? "",
          coverUrl: "",
          courtFee: last?.courtFee != null ? String(last.courtFee) : "",
          currency: last?.currency ?? "MYR",
          participants: [{ account: me.account, role: "OWNER", isPlayer: false, newGuest: false }],
        }}
      />
    </main>
  );
}
