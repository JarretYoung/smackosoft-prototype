import { PageHeader } from "@/src/components/page-header";
import { SessionForm } from "@/src/components/session-form/session-form";
import { today } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

export default async function NewSessionPage() {
  const me = unwrap(await backend.accounts.getCurrent());
  return (
    <main>
      <PageHeader title="Create session" back="/sessions" />
      <SessionForm
        mode="create"
        viewerRole="OWNER"
        initial={{
          // The client picks the id, so a retried save cannot create a second session.
          id: crypto.randomUUID(),
          label: "",
          date: today(),
          location: "",
          locationUrl: "",
          startTime: "",
          endTime: "",
          coverUrl: "",
          courtFee: "",
          currency: "MYR",
          participants: [{ account: me.account, role: "OWNER", isPlayer: false, newGuest: false }],
        }}
      />
    </main>
  );
}
