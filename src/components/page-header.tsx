import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Top bar for sub pages: a back link, a title and an optional action on the right. */
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
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-2 backdrop-blur">
      <Link
        href={back}
        aria-label="Back"
        className="inline-flex size-10 items-center justify-center rounded-full text-primary hover:bg-accent"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {action}
    </header>
  );
}
