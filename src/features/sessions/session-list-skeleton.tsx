import { Skeleton } from "@/src/components/ui/skeleton";

/**
 * Stands in for `AgendaRows` while the list loads. It has the same date column and the same fixed
 * 100px rows, so the page does not move when the real list arrives.
 */
export function AgendaRowsSkeleton({ days = 3 }: { days?: number }) {
  return (
    <ul className="group-list" aria-hidden>
      {Array.from({ length: days }, (_, day) => (
        <li key={day} className="flex">
          <div className="flex w-16 shrink-0 items-start justify-center pt-7">
            <Skeleton className="h-13 w-8 rounded-md" />
          </div>
          <div className="flex h-25 min-w-0 flex-1 items-center gap-3 border-l border-border/70 pr-4 pl-4">
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-2/3 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-3/5 rounded-md" />
            </div>
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-4 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
