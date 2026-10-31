import { Skeleton } from "@/src/components/ui/skeleton";

/** Profile while it loads: the who-you-are header and the shape of the form and lists below it. */
export default function ProfileLoading() {
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="flex items-center gap-4 px-1">
        <Skeleton className="size-20 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">Your details</h2>
        <div className="flex flex-col gap-4">
          <div className="min-h-62 space-y-5 rounded-2xl bg-card p-4 shadow-card">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">Linked accounts</h2>
        <ul className="group-list" aria-hidden>
          <li className="list-row">
            <Skeleton className="size-8 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}
