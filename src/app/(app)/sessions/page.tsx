import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { ShowMore } from "@/src/components/show-more";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { DayList, SessionRows, TodayCard } from "@/src/features/sessions/session-list";
import {
  byViewerDay,
  dayGroup,
  groupByDay,
  leadToday,
  splitDays,
  viewerDay,
} from "@/src/features/sessions/session-days";
import { plural } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import { getViewerZone } from "@/src/lib/viewer-zone";
import { backend } from "@/src/server";

/** The whole calendar. This page lists everything the person can see, not a month around today. */
const ALL_TIME = { from: "1970-01-01", to: "2999-12-31" };
/** How many past sessions show before "Show older". A day is never cut in two. */
const PAST_SHOWN = 20;

export default async function SessionsPage() {
  const [listed, viewerZone] = await Promise.all([backend.sessions.list(ALL_TIME), getViewerZone()]);
  // Everything is on the viewer's calendar and clock. The day of a session is the day it starts for them.
  const sessions = unwrap(listed).sort(byViewerDay(viewerZone));
  // Read after the request, so the clock is not read while prerendering.
  const now = new Date();
  const inGroup = (group: ReturnType<typeof dayGroup>) =>
    sessions.filter((s) => dayGroup(viewerDay(s, viewerZone), viewerZone, now) === group);
  // Every session of today stays here, the running or next one first and big.
  const todays = leadToday(inGroup("today"), now);
  const [hero, ...alsoToday] = todays;
  const thisWeek = inGroup("week");
  const upcoming = groupByDay([...thisWeek, ...inGroup("later")], viewerZone);
  // Newest day first, and within a day the earliest start first.
  const past = splitDays(groupByDay(inGroup("past"), viewerZone).reverse(), PAST_SHOWN);

  const summary = [
    todays.length > 0 && `${todays.length} today`,
    thisWeek.length > 0 && `${thisWeek.length} this week`,
  ].filter(Boolean);
  const older = past.rest.reduce((total, d) => total + d.sessions.length, 0);

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="px-1">
        <h1 className="large-title">Sessions</h1>
        {sessions.length > 0 && (
          <p className="mt-1 text-subhead text-muted-foreground">
            {summary.length ? summary.join(" · ") : "Nothing coming up"}
          </p>
        )}
      </header>

      {sessions.length === 0 && (
        <Empty className="bg-card shadow-card">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-accent text-primary">
              <CalendarPlus />
            </EmptyMedia>
            <EmptyTitle>No sessions yet</EmptyTitle>
            <EmptyDescription>Create one to start tracking matches.</EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link href="/sessions/new">New session</Link>
          </Button>
        </Empty>
      )}

      {hero && (
        <section aria-labelledby="today-heading" className="flex flex-col gap-3">
          <h2 id="today-heading" className="section-title">
            Today
          </h2>
          <TodayCard session={hero} viewerZone={viewerZone} />
          {alsoToday.length > 0 && <SessionRows sessions={alsoToday} viewerZone={viewerZone} />}
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
          <h2 id="upcoming-heading" className="section-title">
            Upcoming
          </h2>
          <DayList days={upcoming} now={now} viewerZone={viewerZone} />
        </section>
      )}

      {past.shown.length > 0 && (
        <section aria-labelledby="past-heading" className="flex flex-col gap-3">
          <h2 id="past-heading" className="section-title">
            Past
          </h2>
          <DayList days={past.shown} now={now} viewerZone={viewerZone} muted />
          {past.rest.length > 0 && (
            <ShowMore label={`Show older (${plural(older, "session")})`}>
              <DayList days={past.rest} now={now} viewerZone={viewerZone} muted />
            </ShowMore>
          )}
        </section>
      )}
    </main>
  );
}
