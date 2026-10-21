import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MonthCalendar } from "@/src/components/month-calendar";
import { AvatarStack, PersonAvatar } from "@/src/components/avatar-stack";
import { LogoutButton } from "@/src/components/logout-button";
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

  return (
    <main className="space-y-5 px-5 pb-6 pt-8">
      <header className="flex items-center gap-3">
        <PersonAvatar person={me.account} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{me.account.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{me.account.handle}</p>
        </div>
        <LogoutButton />
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Tile value={String(stats.matches)} label="Matches" />
        <Tile value={stats.winRate === null ? "-" : `${Math.round(stats.winRate * 100)}%`} label="Win rate" />
        <Tile value={String(stats.streak)} label="Streak" />
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Upcoming sessions</h2>
          <Link href="/sessions" className="text-xs font-medium text-muted-foreground">
            View all
          </Link>
        </div>
        <MonthCalendar today={now} dates={monthDates} />
        <ul className="mt-4 divide-y">
          {upcoming.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nothing coming up.</li>}
          {upcoming.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="flex items-center gap-3 py-3">
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <span className="text-base font-bold leading-none">{dayOf(s.date)}</span>
                  <span className="text-[9px] font-semibold">{monthShort(s.date)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.location ?? "No location"}</p>
                </div>
                <AvatarStack people={s.members} max={2} />
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="mb-3 font-semibold">Teammate stats</h2>
        {teammates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Play a doubles match to see how you do with each partner.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Player</th>
                <th className="pb-2 text-right font-medium">Games</th>
                <th className="pb-2 text-right font-medium">W - L</th>
                <th className="pb-2 text-right font-medium">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {teammates.slice(0, 5).map((t) => {
                const diff = t.wins - t.losses;
                return (
                  <tr key={t.account.id} className="border-t">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <PersonAvatar person={t.account} className="size-7" />
                        <span className="truncate">{t.account.displayName.split(" ")[0]}</span>
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{t.games}</td>
                    <td className={`text-right tabular-nums ${diff < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="text-right tabular-nums">{t.winRate === null ? "-" : `${Math.round(t.winRate * 100)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-primary px-3 py-4 text-center text-primary-foreground shadow-xs">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-primary-foreground/80">{label}</p>
    </div>
  );
}
