import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/features/sessions/session-form";
import { today } from "@/src/lib/format";
import { newSessionInitial } from "@/src/features/sessions/session-defaults";
import { loadPeople } from "@/src/features/sessions/people";
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
        // The client picks the id, so a retried save cannot create a second session.
        initial={newSessionInitial({ id: crypto.randomUUID(), today: today(), me: me.account, last })}
      />
    </main>
  );
}
