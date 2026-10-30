import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/features/sessions/session-form";
import { todayIn } from "@/src/lib/zoned";
import { getViewerZone } from "@/src/lib/viewer-zone";
import { newSessionInitial } from "@/src/features/sessions/session-defaults";
import { byViewerDay, viewerDay } from "@/src/features/sessions/session-days";
import { loadPeople } from "@/src/features/sessions/people";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

/** The session this person last ran, newest first. Its details are what they most likely want again. */
async function lastSession(viewerZone: string) {
  const sessions = await backend.sessions.list().then(unwrap);
  const today = todayIn(viewerZone);
  const latest = sessions
    .filter((s) => s.myRole === "OWNER" && viewerDay(s, viewerZone) <= today)
    .sort((a, b) => byViewerDay(viewerZone)(b, a))[0];
  return latest ? backend.sessions.get({ sessionId: latest.id }).then(unwrap) : null;
}

export default async function NewSessionPage() {
  const viewerZone = await getViewerZone();
  const [me, people, last] = await Promise.all([
    backend.accounts.getCurrent().then(unwrap),
    loadPeople(),
    lastSession(viewerZone),
  ]);
  return (
    <main>
      <PageHeader title="Create session" back="/sessions" />
      <SessionForm
        mode="create"
        viewerRole="OWNER"
        people={people}
        prefilledFrom={last ? viewerDay(last, viewerZone) : undefined}
        // The client picks the id, so a retried save cannot create a second session. The form takes
        // the browser's own zone and day itself, so a stale cookie can never set the zone of a session.
        initial={newSessionInitial({ id: crypto.randomUUID(), today: todayIn(viewerZone), timezone: "", me: me.account, last })}
      />
    </main>
  );
}
