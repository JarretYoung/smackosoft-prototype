import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/features/sessions/session-form";
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
        initial={{
          id: session.id,
          label: session.label,
          date: session.date,
          location: session.location ?? "",
          locationUrl: session.locationUrl ?? "",
          latitude: session.latitude,
          longitude: session.longitude,
          startTime: session.startTime ?? "",
          endTime: session.endTime ?? "",
          coverUrl: session.coverUrl ?? "",
          courtFee: session.courtFee == null ? "" : String(session.courtFee),
          currency: session.currency ?? "MYR",
          members: session.members.map((m) => ({
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
