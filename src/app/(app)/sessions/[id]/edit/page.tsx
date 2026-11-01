import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/features/sessions/session-form";
import { editSessionInitial } from "@/src/features/sessions/session-defaults";
import { loadPeople } from "@/src/features/sessions/people";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";
import { atLeast } from "@/src/contract";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, people] = await Promise.all([backend.sessions.get({ sessionId: id }).then(unwrap), loadPeople()]);
  if (!atLeast(session.myRole, "MANAGER")) notFound();

  return (
    <main>
      <PageHeader title="Edit session" back={`/sessions/${id}`} />
      <SessionForm
        mode="edit"
        viewerRole={session.myRole}
        people={people}
        initial={editSessionInitial(session)}
      />
    </main>
  );
}
