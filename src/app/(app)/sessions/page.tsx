import { CalendarPlus, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { LocalTimeRange } from "@/src/components/local-time";
import { cn } from "@/src/lib/utils";
import { dayOf, monthShort, plural, today } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import type { SessionListItem } from "@/src/contract";
import { backend } from "@/src/server";

export default async function SessionsPage() {
  const sessions = unwrap(await backend.sessions.list());
  const now = today();
  const todays = sessions.filter((s) => s.date === now);
  const upcoming = sessions.filter((s) => s.date > now);
  const past = sessions.filter((s) => s.date < now).reverse();

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="px-1">
        <h1 className="large-title">Sessions</h1>
        <p className="mt-1 text-[0.9375rem] text-muted-foreground">Last month to next month</p>
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

      {todays.length > 0 && (
        <section aria-labelledby="today-heading" className="flex flex-col gap-3">
          <h2 id="today-heading" className="section-label">
            Today
          </h2>
          {todays.map((session) => (
            <TodayCard key={session.id} session={session} />
          ))}
        </section>
      )}

      <SessionGroup title="Upcoming" sessions={upcoming} />
      <SessionGroup title="Past" sessions={past} muted />
    </main>
  );
}

function TodayCard({ session }: { session: SessionListItem }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="pressable block overflow-hidden rounded-[2rem] bg-card shadow-float"
    >
      <div className="relative h-44">
        <SessionCover url={session.coverUrl} className="absolute inset-0" />
        <h3 className="absolute inset-x-5 bottom-4 text-2xl leading-tight font-bold tracking-tight text-white">
          {session.label}
        </h3>
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

function SessionGroup({ title, sessions, muted }: { title: string; sessions: SessionListItem[]; muted?: boolean }) {
  if (sessions.length === 0) return null;
  const headingId = `${title.toLowerCase()}-heading`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="section-label">
        {title}
      </h2>
      <ul className="group-list">
        {sessions.map((session) => (
          <li key={session.id}>
            <SessionRow session={session} muted={muted} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session, muted }: { session: SessionListItem; muted?: boolean }) {
  const players = session.members.filter((m) => m.isPlayer).length;
  const subtitle = [session.location, plural(players || session.members.length, players ? "Player" : "Member")]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/sessions/${session.id}`} className="pressable-row flex items-center gap-3.5 px-4 py-3.5">
      <div
        className={cn(
          "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl",
          muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <span className="score text-xl leading-none">{dayOf(session.date)}</span>
        <span className="mt-0.5 text-[0.625rem] font-bold tracking-wider">{monthShort(session.date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.0625rem] font-semibold tracking-tight">{session.label}</p>
        <p className="truncate text-sm text-muted-foreground">
          <LocalTimeRange start={session.startTime} startOnly suffix=" · " />
          {subtitle}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/70" />
    </Link>
  );
}
