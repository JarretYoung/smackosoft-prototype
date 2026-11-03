import { PageHeaderSkeleton } from "@/src/components/page-header-skeleton";
import { Skeleton } from "@/src/components/ui/skeleton";

/** A match while it loads: the red score card, then the games under it. */
export default function MatchLoading() {
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-7 pb-4">
      <PageHeaderSkeleton />

      <section className="hero mx-4 h-[244px] rounded-4xl p-6 shadow-float" aria-hidden>
        <Skeleton className="mx-auto h-4 w-48 rounded-md bg-white/20" />
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <Skeleton className="h-[152px] rounded-2xl bg-white/15" />
          <span className="w-4" />
          <Skeleton className="h-[152px] rounded-2xl bg-white/15" />
        </div>
      </section>

      <section className="flex flex-col gap-3 px-4">
        <h2 className="section-title">Games</h2>
        <Skeleton className="h-[104px] w-full rounded-2xl" />
        <Skeleton className="h-[104px] w-full rounded-2xl" />
      </section>
    </main>
  );
}
