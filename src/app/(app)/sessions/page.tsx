import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { CourtArt } from "@/src/components/court-art";
import { Button } from "@/src/components/ui/button";
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
    <main>
      <header className="px-5 pt-8 pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">Last month to next month</p>
      </header>

      {sessions.length === 0 && (
        <div className="mx-5 rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-medium">No sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create one to start tracking matches.</p>
          <Button asChild className="mt-4">
            <Link href="/sessions/new">New session</Link>
          </Button>
        </div>
      )}

      {todays.length > 0 && (
        <section className="bg-primary px-5 py-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">Today</h2>
          <div className="space-y-3">
            {todays.map((session) => (
              <TodayCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      <SessionGroup title="Upcoming" sessions={upcoming} />
      <SessionGroup title="Past" sessions={past} />
    </main>
  );
}

function TodayCard({ session }: { session: SessionListItem }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block overflow-hidden rounded-2xl bg-card shadow-md transition active:scale-[0.99]"
    >
      <div className="relative h-36">
        <CourtArt className="absolute inset-0" />
        <h3 className="absolute inset-x-4 bottom-3 text-xl font-bold leading-tight text-white drop-shadow">
          {session.label}
        </h3>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
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

function SessionGroup({ title, sessions }: { title: string; sessions: SessionListItem[] }) {
  if (sessions.length === 0) return null;
  return (
    <section className="px-5 pt-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li key={session.id}>
            <SessionRow session={session} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session }: { session: SessionListItem }) {
  const players = session.members.filter((m) => m.isPlayer).length;
  const subtitle = [session.location, plural(players || session.members.length, players ? "Player" : "Member")]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex items-center gap-4 rounded-2xl border bg-card p-3 pr-4 shadow-xs transition active:scale-[0.99]"
    >
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <span className="text-xl font-bold leading-none">{dayOf(session.date)}</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide">{monthShort(session.date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{session.label}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
