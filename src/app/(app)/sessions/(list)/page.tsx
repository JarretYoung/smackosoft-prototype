import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { RefreshWhenStale } from "@/src/components/refresh-when-stale";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { SessionsMenu } from "@/src/features/sessions/sessions-menu";
import { ALL_TIME, byViewerDay, dayGroup, viewerDay } from "@/src/features/sessions/session-days";
import { SessionsView } from "@/src/features/sessions/sessions-view";
import { unwrap } from "@/src/lib/result";
import { getViewerZone } from "@/src/lib/viewer-zone";
import { backend } from "@/src/server";

// The tab bar links here with `prefetch`, a full prefetch that brings the data along. Next calls
// that the legacy mode and asks the target route to say it is meant (see docs/architecture.md).
export const instant = false;

export default async function SessionsPage() {
  const [listed, viewerZone] = await Promise.all([backend.sessions.list(ALL_TIME), getViewerZone()]);
  // Everything is on the viewer's calendar and clock. The day of a session is the day it starts for them.
  const sessions = unwrap(listed).sort(byViewerDay(viewerZone));
  // Read after the request, so the clock is not read while prerendering.
  const now = new Date();
  const thisWeek = sessions.filter((s) => dayGroup(viewerDay(s, viewerZone), viewerZone, now) === "week");
  const todays = sessions.filter((s) => dayGroup(viewerDay(s, viewerZone), viewerZone, now) === "today");

  const summary = [
    todays.length > 0 && `${todays.length} today`,
    thisWeek.length > 0 && `${thisWeek.length} this week`,
  ].filter(Boolean);

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <RefreshWhenStale renderedAt={now.getTime()} />
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="large-title">Sessions</h1>
          {sessions.length > 0 && (
            <p className="mt-1 text-subhead text-muted-foreground">
              {summary.length ? summary.join(" · ") : "Nothing coming up"}
            </p>
          )}
        </div>
        <SessionsMenu />
      </header>

      {sessions.length === 0 && (
        <Empty className="bg-card shadow-card">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-accent text-primary">
              <CalendarPlus />
            </EmptyMedia>
            <EmptyTitle>No sessions yet</EmptyTitle>
            <EmptyDescription>Create one to start tracking matches, or bring in games you already have.</EmptyDescription>
          </EmptyHeader>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button asChild>
              <Link href="/sessions/new">New session</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/import">Import games</Link>
            </Button>
          </div>
        </Empty>
      )}

      {sessions.length > 0 && <SessionsView sessions={sessions} viewerZone={viewerZone} nowMs={now.getTime()} />}
    </main>
  );
}
