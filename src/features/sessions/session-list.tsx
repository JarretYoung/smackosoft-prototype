import { MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { RowChevron } from "@/src/components/row-chevron";
import { TimeRange } from "@/src/components/time-range";
import type { SessionListItem } from "@/src/contract";
import { durationLabel, plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { LiveBadge, NowOr } from "./live-badge";
import { dayHeading } from "./session-days";

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
            <MapPin className="size-3.5 shrink-0" />
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
 * Sessions as an agenda: a small heading for each day, and under it one white list with a row per
 * session. The day is said once, in the heading, so a row has room for what differs: the time.
 * Days and times are the viewer's own, in `viewerZone`. `muted` greys the times of days gone by.
 */
export function DayList({
  days,
  now,
  viewerZone,
  muted,
}: {
  days: { day: string; sessions: SessionListItem[] }[];
  now: Date;
  viewerZone: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {days.map(({ day, sessions }) => {
        const heading = dayHeading(day, viewerZone, now);
        return (
          <section key={day} aria-label={heading} className="flex flex-col gap-2">
            <h3 className="section-label">{heading}</h3>
            <SessionRows sessions={sessions} viewerZone={viewerZone} muted={muted} />
          </section>
        );
      })}
    </div>
  );
}

/** One white list of session rows, with no heading of its own. */
export function SessionRows({
  sessions,
  viewerZone,
  muted,
}: {
  sessions: SessionListItem[];
  viewerZone: string;
  muted?: boolean;
}) {
  return (
    <ul className="group-list">
      {sessions.map((session) => (
        <li key={session.id}>
          <SessionRow session={session} viewerZone={viewerZone} muted={muted} />
        </li>
      ))}
    </ul>
  );
}

/** How long a session runs, "3 h", or nothing when it has no start and end. */
function lengthOf(session: SessionListItem): string | null {
  if (!session.startTime || !session.endTime) return null;
  const minutes = Math.round((Date.parse(session.endTime) - Date.parse(session.startTime)) / 60_000);
  return minutes > 0 ? durationLabel(minutes) : null;
}

/**
 * One session as a row. The time leads, because it is what tells the sessions of a day apart: the
 * start in bold with the length under it (or a red "Now" while it runs). Then the name and where,
 * and who is in. The times are the viewer's own, in `viewerZone`.
 */
export function SessionRow({
  session,
  viewerZone,
  muted = false,
}: {
  session: SessionListItem;
  viewerZone: string;
  muted?: boolean;
}) {
  const length = lengthOf(session);
  const people = session.members.filter((m) => m.isPlayer || m.role === "OWNER");
  return (
    <Link href={`/sessions/${session.id}`} className="pressable-row list-row">
      <div className="w-[4.5rem] shrink-0">
        {session.startTime ? (
          <>
            <p className={cn("text-subhead font-semibold whitespace-nowrap tabular-nums", muted && "text-muted-foreground")}>
              <TimeRange start={session.startTime} zone={viewerZone} startOnly />
            </p>
            <p className="text-footnote whitespace-nowrap text-muted-foreground tabular-nums">
              <NowOr start={session.startTime} end={session.endTime}>
                {length}
              </NowOr>
            </p>
          </>
        ) : (
          <p className="text-footnote text-muted-foreground">No time</p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-body font-semibold tracking-tight">{session.label}</p>
        {session.location && <p className="truncate text-sm text-muted-foreground">{session.location}</p>}
      </div>
      <AvatarStack people={people.length ? people : session.members} max={2} />
      <RowChevron />
    </Link>
  );
}
