import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/src/components/ui/skeleton";

/** A session while it loads: the red header with its real back link, then the rows of details. */
export default function SessionLoading() {
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-7">
      <section className="hero rounded-b-4xl px-4 pb-6 shadow-float">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/sessions"
            className="pressable inline-flex h-10 items-center gap-0.5 rounded-full bg-white/20 pr-4 pl-2 text-subhead font-semibold backdrop-blur"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
            Sessions
          </Link>
          <Skeleton className="size-10 rounded-full bg-white/20" />
        </div>
        <div className="px-1">
          <Skeleton className="h-9 w-3/4 rounded-xl bg-white/20" />
        </div>
      </section>

      <div className="flex flex-col gap-7 px-4">
        <ul className="group-list" aria-hidden>
          {[0, 1, 2, 3, 4].map((row) => (
            <li key={row} className="list-row h-18">
              <Skeleton className="size-9 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-5 w-1/2 rounded-md" />
              </div>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-3">
          <h2 className="section-title">Matches</h2>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </section>
      </div>
    </main>
  );
}
