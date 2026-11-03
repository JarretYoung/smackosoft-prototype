import { PageHeader } from "@/src/components/page-header";
import { SessionFormSkeleton } from "@/src/features/sessions/session-form-skeleton";

/** The new session form while it reads who you play with and your last session. */
export default function NewSessionLoading() {
  return (
    <main>
      <PageHeader title="Create session" back="/sessions" />
      <SessionFormSkeleton mode="create" />
    </main>
  );
}
