import Link from "next/link";
import { Card, CardContent } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { AgendaRowsSkeleton } from "@/src/features/sessions/session-list-skeleton";

/**
 * Home while it loads. Words that never change are real, so the page reads at once. Each block
 * has the size of what replaces it, so nothing moves when the data arrives.
 */
export default function HomeLoading() {
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <Skeleton className="mt-1 h-6 w-40 rounded-md" />
        </div>
      </header>

      <section className="hero relative overflow-hidden rounded-4xl p-6 shadow-float">
        <h2 className="text-footnote font-semibold tracking-wider text-primary-foreground/90 uppercase">Win rate</h2>
        <div className="mt-1 flex h-[4.5rem] items-center">
          <Skeleton className="h-14 w-36 rounded-2xl bg-white/20" />
        </div>
        <Skeleton className="mt-5 h-1.5 w-full rounded-full bg-white/25" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-[78px] rounded-xl bg-white/15" />
          <Skeleton className="h-[78px] rounded-xl bg-white/15" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Upcoming</h2>
          <Link href="/sessions" className="pressable rounded-md py-1 text-subhead font-semibold text-primary">
            View all
          </Link>
        </div>
        <Card className="py-5">
          <CardContent>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </CardContent>
        </Card>
        <AgendaRowsSkeleton />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Teammates</h2>
        <ul className="group-list" aria-hidden>
          {[0, 1, 2].map((row) => (
            <li key={row} className="list-row">
              <Skeleton className="size-8 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
