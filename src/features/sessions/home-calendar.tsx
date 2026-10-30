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
 * `sessions` is what the home page already loaded, so the arrows stop at the months it covers.
 */
export function HomeCalendar({ today, sessions }: { today: string; sessions: { id: string; date: string }[] }) {
  const router = useRouter();
  const byDate = new Map<string, string[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s.id]);

  const now = toDate(today);
  return (
    <Calendar
      // The server decides what today is, so the ring matches the rest of the page.
      today={now}
      defaultMonth={now}
      startMonth={new Date(now.getFullYear(), now.getMonth() - 1, 1)}
      endMonth={new Date(now.getFullYear(), now.getMonth() + 1, 1)}
      modifiers={{ marked: [...byDate.keys()].map(toDate) }}
      onDayClick={(day) => {
        const ids = byDate.get(day.toLocaleDateString("en-CA"));
        if (ids) router.push(ids.length === 1 ? `/sessions/${ids[0]}` : "/sessions");
      }}
    />
  );
}
