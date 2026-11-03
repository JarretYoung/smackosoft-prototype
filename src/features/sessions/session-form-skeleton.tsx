import { OptionalTag } from "@/src/components/optional-tag";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

const WHEN_ROWS = ["Date", "Starts", "Ends", "Time zone"];

/**
 * The session form while its page loads, for both create and edit. Labels and the button are real. Values
 * are blocks, and each section has the height of the real one, so nothing moves when the form arrives.
 * A new session may also show a line about where its defaults come from, so that line gets room too.
 */
export function SessionFormSkeleton({ mode }: { mode: "create" | "edit" }) {
  return (
    <div aria-busy aria-label="Loading" className="flex flex-col gap-6 px-4 pt-4 pb-4">
      {mode === "create" && (
        <div className="flex h-10 items-start px-1">
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
      )}
      <Skeleton className="h-40 w-full rounded-2xl" />

      <div className="h-[79px] rounded-2xl bg-card px-4 pt-3 pb-4 shadow-card">
        <p className="section-label px-0">Name</p>
        <Skeleton className="mt-1.5 h-6 w-2/3 rounded-md" />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">When</h2>
        <ul className="group-list" aria-hidden>
          {WHEN_ROWS.map((label) => (
            <li key={label} className="list-row h-14 not-first:h-[57px]">
              <span className="min-w-0 flex-1 text-body">{label}</span>
              <Skeleton className="h-5 w-32 rounded-md" />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">Where</h2>
        <div className="flex h-[210px] flex-col justify-between rounded-2xl bg-card p-4 shadow-card" aria-hidden>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">
          Court fee{" "}
          <span className="tracking-normal normal-case">
            <OptionalTag />
          </span>
        </h2>
        <div className="flex h-36 items-center rounded-2xl bg-card p-4 shadow-card" aria-hidden>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">Members</h2>
        <ul className="group-list" aria-hidden>
          <li className="list-row h-17">
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </li>
          <li className="list-row h-[57px]">
            <Skeleton className="h-5 w-28 rounded-md" />
          </li>
        </ul>
      </section>

      <div className="glass-bar sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" className="w-full" disabled>
          {mode === "create" ? "Create session" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
