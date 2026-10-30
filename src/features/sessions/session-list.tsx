import { MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { DateTile } from "@/src/components/date-tile";
import { LocalTimeRange } from "@/src/components/local-time";
import { RowChevron } from "@/src/components/row-chevron";
import type { SessionListItem } from "@/src/contract";
import { plural } from "@/src/lib/format";
import { LiveBadge } from "./live-badge";

export function TodayCard({ session }: { session: SessionListItem }) {
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
            <LocalTimeRange start={session.startTime} end={session.endTime} prefix="Today · " />
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

export function SessionGroup({
  title,
  sessions,
  muted,
}: {
  title: string;
  sessions: SessionListItem[];
  muted?: boolean;
}) {
  if (sessions.length === 0) return null;
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="section-label">
        {title}
      </h2>
      <ul className="group-list">
        {sessions.map((session) => (
          <li key={session.id}>
            <SessionRow session={session} past={muted} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SessionRow({ session, past = false }: { session: SessionListItem; past?: boolean }) {
  const players = session.members.filter((m) => m.isPlayer).length;
  const subtitle = [session.location, plural(players || session.members.length, players ? "Player" : "Member")]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/sessions/${session.id}`} className="pressable-row list-row">
      <DateTile date={session.date} past={past} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold tracking-tight">{session.label}</p>
        <p className="truncate text-sm text-muted-foreground">
          <LocalTimeRange start={session.startTime} startOnly suffix=" · " />
          {subtitle}
        </p>
      </div>
      <RowChevron />
    </Link>
  );
}
