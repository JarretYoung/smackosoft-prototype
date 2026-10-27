import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/components/session-form/session-form";
import { loadPeople } from "@/src/lib/people";
import { unwrap } from "@/src/lib/result";
import { can } from "@/src/lib/roles";
import { backend } from "@/src/server";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, people] = await Promise.all([backend.sessions.get({ sessionId: id }).then(unwrap), loadPeople()]);
  if (!can(session.myRole, "MANAGER")) notFound();

  return (
    <main>
      <PageHeader title="Edit session" back={`/sessions/${id}`} />
      <SessionForm
        mode="edit"
        viewerRole={session.myRole}
        people={people}
        initial={{
          id: session.id,
          label: session.label,
          date: session.date,
          location: session.location ?? "",
          locationUrl: session.locationUrl ?? "",
          startTime: session.startTime ?? "",
          endTime: session.endTime ?? "",
          coverUrl: session.coverUrl ?? "",
          courtFee: session.courtFee == null ? "" : String(session.courtFee),
          currency: session.currency ?? "MYR",
          participants: session.members.map((m) => ({
            account: m,
            role: m.role,
            isPlayer: m.isPlayer,
            newGuest: false,
          })),
        }}
      />
    </main>
  );
}
