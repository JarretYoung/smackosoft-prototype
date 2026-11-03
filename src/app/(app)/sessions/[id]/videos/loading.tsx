import { PageHeaderSkeleton } from "@/src/components/page-header-skeleton";
import { Skeleton } from "@/src/components/ui/skeleton";

/** Videos while they load: the poster, the title, then one row for each game. */
export default function VideosLoading() {
  return (
    <main aria-busy aria-label="Loading">
      <PageHeaderSkeleton title="Videos" />

      <div className="flex flex-col gap-6 px-4 pt-3 pb-6" aria-hidden>
        <Skeleton className="aspect-video w-full rounded-2xl" />

        <section className="flex flex-col gap-3">
          <div>
            <Skeleton className="h-8 w-2/3 rounded-md" />
            <Skeleton className="mt-1 h-5 w-40 rounded-md" />
          </div>
          <Skeleton className="h-[52px] w-full rounded-full" />
        </section>

        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <li key={row} className="-mx-2 flex items-start gap-3 p-2">
              <Skeleton className="aspect-video w-40 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
