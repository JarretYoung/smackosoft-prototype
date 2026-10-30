import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { SessionGroup, SessionRow, TodayCard } from "@/src/features/sessions/session-list";
import { addDays, today } from "@/src/lib/format";
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
