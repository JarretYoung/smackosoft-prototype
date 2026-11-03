"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "@/src/components/ui/calendar";

const toDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Sessions on a month calendar. Days with a session are filled red and today has a ring.
 * Tapping a day with one session opens it, and a day with several opens the sessions list.
 * The arrows go back to the month of the first session and forward to the month of the last, and never
 * less than a month either side of today. Today and each session's day are the viewer's own, worked out
 * by the server from their timezone.
 */
export function HomeCalendar({ today, sessions }: { today: string; sessions: { id: string; date: string }[] }) {
  const router = useRouter();
  const byDate = new Map<string, string[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s.id]);

  const now = toDate(today);
  const days = [...byDate.keys()].toSorted();
  const monthOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const first = days.length ? monthOf(toDate(days[0])) : now;
  const last = days.length ? monthOf(toDate(days[days.length - 1])) : now;
  const earliest = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const latest = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return (
    <Calendar
      key={today}
      today={now}
      defaultMonth={now}
      startMonth={first < earliest ? first : earliest}
      endMonth={last > latest ? last : latest}
      modifiers={{ marked: [...byDate.keys()].map(toDate) }}
      onDayClick={(day) => {
        const ids = byDate.get(day.toLocaleDateString("en-CA"));
        if (ids) router.push(ids.length === 1 ? `/sessions/${ids[0]}` : "/sessions");
      }}
    />
  );
}
