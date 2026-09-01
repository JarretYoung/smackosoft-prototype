import { Card, CardContent } from "@/src/components/ui/card";
import { SPORT_LABELS, Sport } from "@/src/lib/types/sport";

/**
 * Placeholder profile summary. Values are hardcoded until the database and
 * data fetching are in place.
 */
export function ProfileCard() {
  const stats = [
    { label: "Matches", value: "—" },
    { label: "Win rate", value: "—" },
    { label: "Streak", value: "—" },
  ];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground"
          >
            SM
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">Player Name</p>
            <p className="truncate text-sm text-muted-foreground">@username</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md bg-secondary/40 p-2">
              <p className="text-lg font-semibold leading-tight">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-auto text-sm text-muted-foreground">
          Main sport:{" "}
          <span className="text-foreground">
            {SPORT_LABELS[Sport.Badminton]}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
