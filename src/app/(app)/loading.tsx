import { Skeleton } from "@/src/components/ui/skeleton";

/** Shown while a page reads the session and the database. Keeps navigation instant. */
export default function Loading() {
  return (
    <div className="space-y-4 px-5 pt-8" aria-busy>
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
