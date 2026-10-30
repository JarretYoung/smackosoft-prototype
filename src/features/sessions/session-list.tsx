import { MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { DateTile } from "@/src/components/date-tile";
import { RowChevron } from "@/src/components/row-chevron";
import { ShowMore } from "@/src/components/show-more";
import { TimeRange } from "@/src/components/time-range";
import type { SessionListItem } from "@/src/contract";
import { plural } from "@/src/lib/format";
import { LiveBadge } from "./live-badge";
import { dayLabel, viewerDay } from "./session-days";

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
 * A titled list of sessions. With `limit`, a long group shows that many and a button for the rest,
 * which keeps a long history from burying what is coming up.
 */
export function SessionGroup({
  title,
  sessions,
  now,
  viewerZone,
  muted,
  limit,
  moreLabel,
}: {
  title: string;
  sessions: SessionListItem[];
  now: Date;
  viewerZone: string;
  muted?: boolean;
  limit?: number;
  moreLabel?: string;
}) {
  if (sessions.length === 0) return null;
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  const rows = sessions.map((session) => (
    <li key={session.id}>
      <SessionRow session={session} now={now} viewerZone={viewerZone} past={muted} />
    </li>
  ));
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="section-label">
        {title}
      </h2>
      <ul className="group-list">
        {limit ? (
          <ShowMore initial={limit} label={moreLabel ?? "Show more"}>
            {rows}
          </ShowMore>
        ) : (
          rows
        )}
      </ul>
    </section>
  );
}

/**
 * One session as a row: the weekday (or Tomorrow) and the time range, then where and who. The day
 * and the times are the viewer's own, in `viewerZone`, so every row reads on one clock.
 * Rows already under a Today heading leave the day out with `showDay={false}`.
 */
export function SessionRow({
  session,
  now,
  viewerZone,
  past = false,
  showDay = true,
}: {
  session: SessionListItem;
  now: Date;
  viewerZone: string;
  past?: boolean;
  showDay?: boolean;
}) {
  const day = viewerDay(session, viewerZone);
  const players = session.members.filter((m) => m.isPlayer).length;
  const subtitle = [session.location, plural(players || session.members.length, players ? "Player" : "Member")]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/sessions/${session.id}`} className="pressable-row list-row">
      <DateTile date={day} past={past} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold tracking-tight">{session.label}</p>
        <p className="truncate text-sm text-muted-foreground">
          {showDay && `${dayLabel(day, viewerZone, now)} · `}
          <TimeRange start={session.startTime} end={session.endTime} zone={viewerZone} suffix=" · " />
          {subtitle}
        </p>
      </div>
      <RowChevron />
    </Link>
  );
}
