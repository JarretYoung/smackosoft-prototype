import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/src/components/ui/button";
import { LeaveLink } from "@/src/hooks/unsaved-changes";

/** Navigation bar for sub pages: a back button, a centered title and an optional action. */
export function PageHeader({
  title,
  back,
  action,
}: {
  title: string;
  back: string;
  action?: ReactNode;
}) {
  return (
    <header className="glass-bar sticky top-0 z-10 grid h-14 grid-cols-[3rem_1fr_3rem] items-center px-2">
      <LeaveLink
        href={back}
        aria-label="Back"
        className={buttonVariants({ variant: "bare", size: "icon" })}
      >
        <ChevronLeft className="size-6" strokeWidth={2.5} />
      </LeaveLink>
      <h1 className="truncate text-center text-body font-semibold tracking-tight">{title}</h1>
      <div className="flex justify-end">{action}</div>
    </header>
  );
}
