import { cn } from "@/src/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * A small month grid. Days with a session are filled red, today has a ring.
 * `dates` are "YYYY-MM-DD" strings. Weeks start on Monday.
 */
export function MonthCalendar({ today, dates }: { today: string; dates: Set<string> }) {
  const [year, month] = today.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const title = first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const iso = (day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-[10px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`b${i}`} />
          ) : (
            <span
              key={day}
              className={cn(
                "mx-auto flex size-7 items-center justify-center rounded-full",
                dates.has(iso(day)) && "bg-primary font-semibold text-primary-foreground",
                iso(day) === today && !dates.has(iso(day)) && "ring-1 ring-primary",
              )}
            >
              {day}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
