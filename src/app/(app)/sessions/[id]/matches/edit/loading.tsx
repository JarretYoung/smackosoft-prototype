import { PageHeaderSkeleton } from "@/src/components/page-header-skeleton";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

/** The match editor while it loads: the switcher, the details card, the teams and the games. */
export default function EditMatchLoading() {
  return (
    <main aria-busy aria-label="Loading">
      <PageHeaderSkeleton />

      <div className="flex items-center gap-2 px-4 py-4" aria-hidden>
        <Skeleton className="h-[52px] flex-1 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>

      <div className="flex flex-col gap-6 px-4 pb-4">
        <section className="flex h-[314px] flex-col justify-between rounded-2xl bg-card p-4 shadow-card" aria-hidden>
          {["Name", "Type", "Format"].map((label) => (
            <div key={label} className="space-y-2">
              <p className="text-sm font-medium">{label}</p>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="section-label">Teams</h2>
          <div className="grid grid-cols-2 gap-3" aria-hidden>
            <Skeleton className="h-[95px] rounded-2xl" />
            <Skeleton className="h-[95px] rounded-2xl" />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="section-label">Games</h2>
          <Skeleton className="h-[188px] w-full rounded-2xl" />
          <Skeleton className="h-[188px] w-full rounded-2xl" />
        </section>

        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4">
          <Button type="button" size="lg" className="w-full" disabled>
            Save match
          </Button>
        </div>
      </div>
    </main>
  );
}
