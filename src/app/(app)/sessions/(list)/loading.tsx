import { Skeleton } from "@/src/components/ui/skeleton";
import { AgendaRowsSkeleton } from "@/src/features/sessions/session-list-skeleton";

/** The Sessions list while it loads. The title is real. The rows keep the size of real ones. */
export default function SessionsLoading() {
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="px-1">
        <h1 className="large-title">Sessions</h1>
        <Skeleton className="mt-2 h-4 w-40 rounded-md" />
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="section-title">Upcoming</h2>
        <AgendaRowsSkeleton days={4} />
      </section>
    </main>
  );
}
