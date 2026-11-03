import { PageHeaderSkeleton } from "@/src/components/page-header-skeleton";
import { SessionFormSkeleton } from "@/src/features/sessions/session-form-skeleton";

/** The edit session form while it loads. */
export default function EditSessionLoading() {
  return (
    <main>
      <PageHeaderSkeleton title="Edit session" />
      <SessionFormSkeleton mode="edit" />
    </main>
  );
}
