import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MonthCalendar } from "@/src/components/month-calendar";
import { AvatarStack, PersonAvatar } from "@/src/components/avatar-stack";
import { LocalTimeRange } from "@/src/components/local-time";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { Progress } from "@/src/components/ui/progress";
import { dayOf, monthShort, today } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

export default async function HomePage() {
  const me = unwrap(await backend.accounts.getCurrent());
  const stats = unwrap(await backend.stats.get());
  const teammates = unwrap(await backend.stats.getTeammates());
  const sessions = unwrap(await backend.sessions.list());

  const now = today();
  const monthPrefix = now.slice(0, 7);
  const upcoming = sessions.filter((s) => s.date >= now).slice(0, 3);
  const monthDates = new Set(sessions.filter((s) => s.date.startsWith(monthPrefix)).map((s) => s.date));
  const winPercent = stats.winRate === null ? null : Math.round(stats.winRate * 100);

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header>
        <Link href="/profile" className="pressable flex items-center gap-3">
          <PersonAvatar person={me.account} className="size-12 text-base" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="truncate text-xl leading-tight font-bold tracking-tight">{me.account.displayName}</h1>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      </header>

      {/* The one bold surface on this screen: how you are doing. */}
      <section aria-labelledby="form-heading" className="hero relative overflow-hidden rounded-[2rem] p-6 shadow-float">
        <h2 id="form-heading" className="text-[0.8125rem] font-semibold tracking-wider text-primary-foreground/90 uppercase">
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
          <h2 className="text-xl font-bold tracking-tight">Upcoming</h2>
          <Link href="/sessions" className="pressable rounded-md py-1 text-[0.9375rem] font-semibold text-primary">
            View all
          </Link>
        </div>
        <Card className="py-5">
          <CardContent>
            <MonthCalendar today={now} dates={monthDates} />
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
                <Link href={`/sessions/${s.id}`} className="pressable-row flex items-center gap-3 px-4 py-3">
                  <DateChip date={s.date} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <LocalTimeRange start={s.startTime} end={s.endTime} suffix={s.location ? " · " : ""} />
                      {s.location ?? (s.startTime ? "" : "No details")}
                    </p>
                  </div>
                  <AvatarStack people={s.members} max={2} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold tracking-tight">Partners</h2>
        {teammates.length === 0 ? (
          <Empty className="rounded-2xl bg-card p-6 shadow-card">
            <EmptyHeader>
              <EmptyTitle>No partner stats yet</EmptyTitle>
              <EmptyDescription>Play a doubles match to see how you do with each partner.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="group-list">
            {teammates.slice(0, 5).map((t) => {
              const diff = t.wins - t.losses;
              return (
                <li key={t.account.id} className="flex items-center gap-3 px-4 py-3">
                  <PersonAvatar person={t.account} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.account.displayName.split(" ")[0]}</p>
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

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3">
      <dd className="score text-3xl leading-none">{value}</dd>
      <dt className="mt-1 text-sm text-primary-foreground/90">{label}</dt>
    </div>
  );
}

function DateChip({ date }: { date: string }) {
  return (
    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
      <span className="score text-lg leading-none">{dayOf(date)}</span>
      <span className="mt-0.5 text-[0.625rem] font-bold tracking-wider">{monthShort(date)}</span>
    </div>
  );
}
