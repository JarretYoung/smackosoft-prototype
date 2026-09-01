import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import { Separator } from "@/src/components/ui/separator";
import { SPORT_LABELS, Sport } from "@/src/lib/types/sport";

/**
 * V2 profile summary — a wider "hero" treatment built from shadcn Avatar,
 * Badge, Progress and Separator. Values stay hardcoded until data fetching
 * exists; see profile-card.tsx for the V1 alternative.
 */
export function ProfileCardV2() {
  const stats = [
    { label: "Matches", value: "—" },
    { label: "Wins", value: "—" },
    { label: "Streak", value: "—" },
  ];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarFallback className="bg-secondary text-lg font-semibold text-secondary-foreground">
              SM
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">Player Name</p>
            <p className="truncate text-sm text-muted-foreground">@username</p>
            <Badge variant="secondary" className="mt-2">
              {SPORT_LABELS[Sport.Badminton]}
            </Badge>
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Win rate</span>
            <span className="text-sm font-medium">—</span>
          </div>
          {/* Zero until real results exist; the bar shows the shape of it. */}
          <Progress value={0} indicatorClassName="bg-secondary" />
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md bg-background/60 p-2">
              <p className="text-lg font-semibold leading-tight">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
