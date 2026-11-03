import { ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

/**
 * The bar of `PageHeader` while its page loads. A loading screen cannot read the route, so the back arrow
 * is drawn and does nothing. Give `title` when it never changes. Leave it out when the data decides it
 * ("Game" or "Match"), and a block stands in, so the word never flips.
 */
export function PageHeaderSkeleton({ title }: { title?: string }) {
  return (
    <header className="glass-bar sticky top-0 z-10 grid h-14 grid-cols-[3rem_1fr_3rem] items-center px-2">
      <span aria-hidden className={buttonVariants({ variant: "bare", size: "icon" })}>
        <ChevronLeft className="size-6" strokeWidth={2.5} />
      </span>
      {title ? (
        <h1 className="truncate text-center text-body font-semibold tracking-tight">{title}</h1>
      ) : (
        <h1 className="flex justify-center">
          <Skeleton className="h-5 w-16 rounded-md" />
        </h1>
      )}
      <div />
    </header>
  );
}
