import { CalendarPlus, MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { DateTile } from "@/src/components/date-tile";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { LiveBadge } from "@/src/components/live-badge";
import { LocalTimeRange } from "@/src/components/local-time";
import { addDays, plural, today } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import type { SessionListItem } from "@/src/contract";
import { backend } from "@/src/server";

export default async function SessionsPage() {
  const sessions = unwrap(await backend.sessions.list());
  const now = today();
  const weekEnd = addDays(now, 7);
  // Earliest start first. A session with no start time goes last.
  const byStart = (a: SessionListItem, b: SessionListItem) =>
    (a.startTime ?? "9").localeCompare(b.startTime ?? "9");
  const todays = sessions.filter((s) => s.date === now).sort(byStart);
  const [hero, ...alsoToday] = todays;
  const upcoming = sessions.filter((s) => s.date > now);
  const thisWeek = upcoming.filter((s) => s.date <= weekEnd);
  const later = upcoming.filter((s) => s.date > weekEnd);
  const past = sessions.filter((s) => s.date < now).reverse();

  const summary = [
    todays.length > 0 && `${todays.length} today`,
    thisWeek.length > 0 && `${thisWeek.length} this week`,
  ].filter(Boolean);

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
        <section aria-labelledby="today-heading" className="flex flex-col gap-2">
          <h2 id="today-heading" className="section-label">
            Today
          </h2>
          <TodayCard session={hero} />
          {alsoToday.length > 0 && (
            <ul className="group-list">
              {alsoToday.map((session) => (
                <li key={session.id}>
                  <SessionRow session={session} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <SessionGroup title="This week" sessions={thisWeek} />
      <SessionGroup title="Later" sessions={later} />
      <SessionGroup title="Past" sessions={past} muted />
    </main>
  );
}

function TodayCard({ session }: { session: SessionListItem }) {
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

function SessionGroup({
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

function SessionRow({ session, past = false }: { session: SessionListItem; past?: boolean }) {
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
