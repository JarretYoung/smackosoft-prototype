import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { DateBlock, type DateState } from "@/src/components/date-block";
import { RowChevron } from "@/src/components/row-chevron";
import { TimeRange } from "@/src/components/time-range";
import type { SessionListItem } from "@/src/contract";
import { monthFor, plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { LiveBadge, NowMark } from "./live-badge";
import { dayGroup, groupByDay } from "./session-days";

/** The big card for today's lead session. Its time is on the viewer's clock, in `viewerZone`. */
export function TodayCard({ session, viewerZone }: { session: SessionListItem; viewerZone: string }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="pressable block overflow-hidden rounded-4xl bg-card shadow-float"
    >
      <div className="relative h-44">
        <SessionCover url={session.coverUrl} className="absolute inset-0" />
        <LiveBadge start={session.startTime} end={session.endTime} className="absolute top-4 left-5" />
        <div className="absolute inset-x-5 bottom-4">
          <p className="text-sm font-medium text-white/85">
            <TimeRange start={session.startTime} end={session.endTime} zone={viewerZone} prefix="Today · " />
          </p>
          <h3 className="text-2xl leading-tight font-bold tracking-tight text-white">{session.label}</h3>
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-4">
        <AvatarStack people={session.members.filter((m) => m.isPlayer || m.role === "OWNER")} max={3} />
        {session.location && (
          <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{session.location}</span>
          </span>
        )}
        <span className="ml-auto shrink-0 text-sm font-semibold text-primary">
          {plural(session.matchCount, "Match", "Matches")}
        </span>
      </div>
    </Link>
  );
}

/**
 * Sessions grouped by month, each month a small heading over its own white list. `months` are
 * already in the order to show. A month is named like "November", with the year added when it is
 * not this year. The date block names the month too, so a row still reads on its own.
 */
export function MonthLists({
  months,
  now,
  viewerZone,
  today,
}: {
  months: { month: string; days: { day: string; sessions: SessionListItem[] }[] }[];
  now: Date;
  viewerZone: string;
  today: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {months.map(({ month, days }) => {
        const heading = monthFor(`${month}-01`, today);
        return (
          <section key={month} aria-label={heading} className="flex flex-col gap-2">
            <h3 className="section-label">{heading}</h3>
            <AgendaRows sessions={days.flatMap((d) => d.sessions)} now={now} viewerZone={viewerZone} />
          </section>
        );
      })}
    </div>
  );
}

/**
 * One white list of sessions on the viewer's own days and clock, one item per day. Each day has a
 * single date column that runs the height of all its sessions, with the date block at the top level
 * with the first name. For today that column is solid red, so the fill never stops partway. The
 * sessions of the day stack to its right, split by a short rule. Give it sessions already in order.
 *
 * The column is 64px wide, a slim spine. A session row is 100px tall, and the block's middle sits on
 * the middle of that first row.
 */
export function AgendaRows({
  sessions,
  now,
  viewerZone,
}: {
  sessions: SessionListItem[];
  now: Date;
  viewerZone: string;
}) {
  return (
    <ul className="group-list">
      {groupByDay(sessions, viewerZone).map(({ day, sessions: ofDay }) => {
        const group = dayGroup(day, viewerZone, now);
        const state: DateState = group === "past" ? "past" : group === "today" ? "today" : "upcoming";
        const today = state === "today";
        return (
          <li key={day} className="flex">
            <div
              className={cn(
                "flex w-16 shrink-0 items-start justify-center pt-7",
                today && "bg-primary text-primary-foreground",
              )}
            >
              <DateBlock date={day} state={state} />
            </div>
            <ul className={cn("min-w-0 flex-1 divide-y divide-border/70", !today && "border-l border-border/70")}>
              {ofDay.map((session) => (
                <li key={session.id}>
                  <SessionRow session={session} viewerZone={viewerZone} past={state === "past"} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One session: the name, the short time (a red "Now" in front while it runs) and the place, each on
 * its own line with its icon. Up to two people sit on the right at the standard 32px, then a
 * chevron. Times are the viewer's own. Every line truncates, so a row is always 100px tall.
 *
 * Spacing is on a 4px grid. The name is 16 on 24 and the detail lines 14 on 20, each 4px from the
 * next, with 14px above and below.
 */
function SessionRow({ session, viewerZone, past }: { session: SessionListItem; viewerZone: string; past: boolean }) {
  const people = session.members.filter((m) => m.isPlayer || m.role === "OWNER");
  return (
    <Link href={`/sessions/${session.id}`} className="pressable-row flex items-center gap-3 py-3.5 pr-4 pl-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-body leading-6 font-semibold tracking-tight">{session.label}</p>
        <p className={cn("flex items-center gap-1.5 text-sm leading-5 tabular-nums", past && "text-muted-foreground")}>
          <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {session.startTime ? (
            <span className="truncate">
              <NowMark start={session.startTime} end={session.endTime} />
              <TimeRange start={session.startTime} end={session.endTime} zone={viewerZone} short />
            </span>
          ) : (
            <span className="text-muted-foreground">No time set</span>
          )}
        </p>
        {session.location && (
          <p className="flex items-center gap-1.5 text-sm leading-5 text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{session.location}</span>
          </p>
        )}
      </div>
      <AvatarStack people={people.length ? people : session.members} max={2} />
      <RowChevron />
    </Link>
  );
}
