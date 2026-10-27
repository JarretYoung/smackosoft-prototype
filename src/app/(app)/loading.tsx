import { Skeleton } from "@/src/components/ui/skeleton";

/** Shown while a page reads the session and the database. Keeps navigation instant. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-busy aria-label="Loading">
      <Skeleton className="h-9 w-40 rounded-xl" />
      <Skeleton className="h-4 w-56 rounded-md" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-20 w-full rounded-3xl" />
      <Skeleton className="h-20 w-full rounded-3xl" />
    </div>
  );
}
