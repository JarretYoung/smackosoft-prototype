import Link from "next/link";
import { AvatarStack, PersonAvatar } from "@/src/components/avatar-stack";
import { DateTile } from "@/src/components/date-tile";
import { HeroStat } from "@/src/features/home/hero-stat";
import { HomeCalendar } from "@/src/features/sessions/home-calendar";
import { RowChevron } from "@/src/components/row-chevron";
import { TimeRange } from "@/src/components/time-range";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { Progress } from "@/src/components/ui/progress";
import { byViewerDay, dayGroup, viewerDay } from "@/src/features/sessions/session-days";
import { addDays, monthWindow } from "@/src/lib/format";
import { todayIn } from "@/src/lib/zoned";
import { unwrap } from "@/src/lib/result";
import { getViewerZone } from "@/src/lib/viewer-zone";
import { backend } from "@/src/server";

export default async function HomePage() {
  // The zone comes from the request, so the clock is read after it, which a Server Component may do.
  const viewerZone = await getViewerZone();
  const now = new Date();
  // Today, and every day on this page, is the viewer's own.
  const today = todayIn(viewerZone, now);
  // The calendar shows last, this and next month around today. A session's saved date is in its own
  // zone, so ask a day wider each side and let each session's day on the viewer's calendar decide.
  const months = monthWindow(today);
  const [meResult, statsResult, teammatesResult, sessionsResult] = await Promise.all([
    backend.accounts.getCurrent(),
    backend.stats.get(),
    backend.stats.getTeammates(),
    backend.sessions.list({ from: addDays(months.from, -1), to: addDays(months.to, 1) }),
  ]);
  const me = unwrap(meResult);
  const stats = unwrap(statsResult);
  const teammates = unwrap(teammatesResult);
  const sessions = unwrap(sessionsResult).sort(byViewerDay(viewerZone));

  const upcoming = sessions
    .filter((s) => dayGroup(viewerDay(s, viewerZone), viewerZone, now) !== "past")
    .slice(0, 3);
  const winPercent = stats.winRate === null ? null : Math.round(stats.winRate * 100);

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header>
        <Link href="/profile" className="pressable flex items-center gap-3">
          <PersonAvatar person={me.account} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="section-title truncate">{me.account.displayName}</h1>
          </div>
          <RowChevron />
        </Link>
      </header>

      {/* The one bold surface on this screen: how you are doing. */}
      <section aria-labelledby="form-heading" className="hero relative overflow-hidden rounded-4xl p-6 shadow-float">
        <h2 id="form-heading" className="text-footnote font-semibold tracking-wider text-primary-foreground/90 uppercase">
          Win rate
        </h2>
        <p className="score mt-1 text-[4.5rem] leading-none">{winPercent === null ? "-" : `${winPercent}%`}</p>
        <Progress
          value={winPercent ?? 0}
          aria-label="Win rate"
          className="mt-5 h-1.5 bg-white/25 [&>div]:bg-white"
        />
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <HeroStat value={String(stats.matches)} label="Matches" />
          <HeroStat value={String(stats.streak)} label="Win streak" />
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Upcoming</h2>
          <Link href="/sessions" className="pressable rounded-md py-1 text-subhead font-semibold text-primary">
            View all
          </Link>
        </div>
        <Card className="py-5">
          <CardContent>
            <HomeCalendar today={today} sessions={sessions.map((s) => ({ id: s.id, date: viewerDay(s, viewerZone) }))} />
          </CardContent>
        </Card>
        {upcoming.length === 0 ? (
          <Empty className="rounded-2xl bg-card p-6 shadow-card">
            <EmptyHeader>
              <EmptyTitle>Nothing coming up</EmptyTitle>
              <EmptyDescription>Create a session to get a game on the calendar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="group-list">
            {upcoming.map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="pressable-row list-row">
                  <DateTile date={viewerDay(s, viewerZone)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold tracking-tight">{s.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <TimeRange start={s.startTime} end={s.endTime} zone={viewerZone} suffix={s.location ? " · " : ""} />
                      {s.location ?? (s.startTime ? "" : "No details")}
                    </p>
                  </div>
                  <AvatarStack people={s.members} max={2} size="sm" />
                  <RowChevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Teammates</h2>
        {teammates.length === 0 ? (
          <Empty className="rounded-2xl bg-card p-6 shadow-card">
            <EmptyHeader>
              <EmptyTitle>No teammate stats yet</EmptyTitle>
              <EmptyDescription>Play a doubles match to see how you do with each teammate.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="group-list">
            {teammates.slice(0, 5).map((t) => {
              const diff = t.wins - t.losses;
              return (
                <li key={t.account.id} className="list-row">
                  <PersonAvatar person={t.account} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold tracking-tight">{t.account.displayName.split(" ")[0]}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {t.games} {t.games === 1 ? "game" : "games"}
                    </p>
                  </div>
                  <Badge variant={diff < 0 ? "tinted" : "secondary"} className="tabular-nums">
                    {diff > 0 ? `+${diff}` : diff}
                  </Badge>
                  <span className="score w-12 text-right text-lg">
                    {t.winRate === null ? "-" : `${Math.round(t.winRate * 100)}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
