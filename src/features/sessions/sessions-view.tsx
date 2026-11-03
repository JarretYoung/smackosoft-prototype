"use client";

import { CalendarPlus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ShowMore } from "@/src/components/show-more";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { Input } from "@/src/components/ui/input";
import type { SessionListItem } from "@/src/contract";
import { useUrlParam } from "@/src/hooks/use-url-param";
import { plural } from "@/src/lib/format";
import { todayIn } from "@/src/lib/zoned";
import type { FilterPlayer } from "./match-players";
import { PlayerFilterRow, useChosenPlayers, type Leaves } from "./player-filter-row";
import { AgendaRows, MonthLists, TodayCard } from "./session-list";
import { dayGroup, groupByDay, groupByMonth, leadToday, splitDays, viewerDay } from "./session-days";
import { sessionSearch } from "./session-search";

/** How many past sessions show before "Show older". A day is never cut in two. */
const PAST_SHOWN = 20;

/** Everyone who is a member of at least one session, the one in the most first. */
function peopleOf(sessions: readonly SessionListItem[]): FilterPlayer[] {
  const seen = new Map<string, FilterPlayer & { count: number }>();
  for (const session of sessions) {
    for (const { id, displayName, handle, avatarUrl } of session.members) {
      const found = seen.get(id);
      if (found) found.count++;
      else seen.set(id, { id, displayName, handle, avatarUrl, count: 1 });
    }
  }
  return [...seen.values()]
    .toSorted((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName))
    .map(({ id, displayName, handle, avatarUrl }) => ({ id, displayName, handle, avatarUrl }));
}

/**
 * The sessions list with a search and a player filter above it. Both run in the browser on the sessions the page
 * already loaded, so a result shows as you type. The list keeps its order and its months. Search and filter only
 * leave out the sessions that do not match, and while either is on, "Show older" is lifted so nothing is cut off.
 * `?q=` and `?players=` are in the address, so Back returns to the same view.
 */
export function SessionsView({ sessions, viewerZone, nowMs }: { sessions: SessionListItem[]; viewerZone: string; nowMs: number }) {
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const today = todayIn(viewerZone, now);
  const [query, setQuery] = useUrlParam("q");
  const people = useMemo(() => peopleOf(sessions), [sessions]);
  const { chosen, picked, toggle, clear: clearPlayers } = useChosenPlayers(people);
  const search = useMemo(() => sessionSearch(sessions, viewerZone), [sessions, viewerZone]);
  const matched = search(query);

  const keep = (session: SessionListItem, ids: string[]) =>
    (matched === null || matched.has(session.id)) && ids.every((id) => session.members.some((m) => m.id === id));
  const visible = sessions.filter((session) => keep(session, chosen));
  const filtering = query.trim() !== "" || chosen.length > 0;
  const describe = (ids: string[]): Leaves => {
    const n = sessions.filter((session) => keep(session, ids)).length;
    return { line: plural(n, "session"), show: plural(n, "session"), none: n === 0 };
  };
  const clearAll = () => {
    setQuery("");
    clearPlayers();
  };

  const inGroup = (group: ReturnType<typeof dayGroup>) => visible.filter((s) => dayGroup(viewerDay(s, viewerZone), viewerZone, now) === group);
  // Every session of today stays here, the running or next one first and big.
  const todays = leadToday(inGroup("today"), now);
  const [hero, ...alsoToday] = todays;
  const upcoming = groupByMonth(groupByDay([...inGroup("week"), ...inGroup("later")], viewerZone));
  // Newest day first, and within a day the earliest start first.
  const past = splitDays(groupByDay(inGroup("past"), viewerZone).reverse(), filtering ? Number.POSITIVE_INFINITY : PAST_SHOWN);
  const older = past.rest.reduce((total, d) => total + d.sessions.length, 0);

  return (
    <>
      {sessions.length > 1 && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search sessions"
              placeholder="Search sessions, places, people"
              value={query}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {people.length > 1 && (
            <PlayerFilterRow
              people={people}
              chosen={chosen}
              picked={picked}
              describe={describe}
              description="Show only the sessions all of the ticked players are in."
              onToggle={toggle}
              onClear={clearPlayers}
            />
          )}
          {filtering && (
            <p role="status" className="px-1 text-sm text-muted-foreground">
              {visible.length} of {plural(sessions.length, "session")}
            </p>
          )}
        </div>
      )}

      {filtering && visible.length === 0 && (
        <Empty className="bg-card shadow-card">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-accent text-primary">
              <CalendarPlus />
            </EmptyMedia>
            <EmptyTitle>No sessions match</EmptyTitle>
            <EmptyDescription>Try fewer words, or clear the filter.</EmptyDescription>
          </EmptyHeader>
          <Button type="button" onClick={clearAll}>
            Clear search and filter
          </Button>
        </Empty>
      )}

      {hero && (
        <section aria-labelledby="today-heading" className="flex flex-col gap-3">
          <h2 id="today-heading" className="section-title">
            Today
          </h2>
          <TodayCard session={hero} viewerZone={viewerZone} />
          {alsoToday.length > 0 && <AgendaRows sessions={alsoToday} now={now} viewerZone={viewerZone} />}
        </section>
      )}

      {!filtering && todays.length === 0 && upcoming.length === 0 && (
        <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
          <h2 id="upcoming-heading" className="section-title">
            Upcoming
          </h2>
          <Empty className="bg-card shadow-card">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-accent text-primary">
                <CalendarPlus />
              </EmptyMedia>
              <EmptyTitle>Nothing coming up</EmptyTitle>
              <EmptyDescription>Create a session to get the next game on the calendar.</EmptyDescription>
            </EmptyHeader>
            <Button asChild>
              <Link href="/sessions/new">New session</Link>
            </Button>
          </Empty>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
          <h2 id="upcoming-heading" className="section-title">
            Upcoming
          </h2>
          <MonthLists months={upcoming} now={now} viewerZone={viewerZone} today={today} />
        </section>
      )}

      {past.shown.length > 0 && (
        <section aria-labelledby="past-heading" className="flex flex-col gap-3">
          <h2 id="past-heading" className="section-title">
            Past
          </h2>
          <MonthLists months={groupByMonth(past.shown)} now={now} viewerZone={viewerZone} today={today} />
          {past.rest.length > 0 && (
            <ShowMore label={`Show older (${plural(older, "session")})`}>
              <MonthLists months={groupByMonth(past.rest)} now={now} viewerZone={viewerZone} today={today} />
            </ShowMore>
          )}
        </section>
      )}
    </>
  );
}
