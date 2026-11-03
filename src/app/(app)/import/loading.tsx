import { ChevronLeft, FileUp, Globe } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Footer } from "@/src/features/imports/footer";

/**
 * Import while the page reads the viewer and the people list. The header, steps, intro and labels are
 * real, so the page reads at once. Only the time zone is a block, because the browser picks it.
 */
export default function ImportLoading() {
  return (
    <main aria-busy aria-label="Loading">
      <header className="glass-bar sticky top-0 z-10 grid h-14 grid-cols-[3rem_1fr_3rem] items-center px-2">
        <Link href="/sessions" aria-label="Back" className={buttonVariants({ variant: "bare", size: "icon" })}>
          <ChevronLeft className="size-6" strokeWidth={2.5} />
        </Link>
        <h1 className="truncate text-center text-body font-semibold tracking-tight">Import games</h1>
        <div />
      </header>

      <div className="flex flex-col gap-6 px-4 pt-4 pb-32">
        <nav aria-label="Import steps" className="-mb-2 px-1">
          <ol className="flex items-center gap-2 text-footnote font-medium tracking-wide uppercase">
            <li className="flex items-center gap-2">
              <span className="text-foreground">1 File</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-px w-4 bg-border" />
              <span className="text-muted-foreground">2 Check</span>
            </li>
          </ol>
        </nav>

        <p className="px-1 text-subhead text-muted-foreground">
          Bring in a list of games and their videos from a file. Each row is a game, or a video not yet tied to a game. Nothing is saved until you
          confirm.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="section-label">Settings</h2>
          <div className="group-list" aria-hidden>
            <div className="list-row">
              <span className="min-w-0 flex-1 text-body">File format</span>
              <span className="text-subhead text-muted-foreground">BurningMars playlist</span>
            </div>
            <div className="list-row">
              <span className="min-w-0 flex-1">
                <span className="block text-body">Time zone for new sessions</span>
                <Skeleton className="mt-1 h-4 w-40 rounded-md" />
              </span>
              <Globe className="size-4 text-muted-foreground" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="section-label">Your files</h2>
            <span className={buttonVariants({ variant: "text", size: "sm" })}>Download template</span>
          </div>
          <div className="group-list" aria-hidden>
            <div className="flex min-h-14 w-full items-center gap-3 px-4 font-semibold text-primary">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <FileUp className="size-4" strokeWidth={2.5} />
              </span>
              Choose CSV files
            </div>
          </div>
        </section>

        <Footer>
          <Button type="button" size="lg" className="w-full" disabled>
            Continue
          </Button>
        </Footer>
      </div>
    </main>
  );
}
