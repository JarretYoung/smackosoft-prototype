import Link from "next/link";

import { Card, CardContent } from "@/src/components/ui/card";

/**
 * Placeholder for the stats chart. The card is the click target for the full
 * stats page; the chart itself is added once match data exists.
 */
export function StatsChartCard() {
  return (
    <Link
      href="/stats"
      aria-label="View your stats"
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="transition-colors hover:bg-secondary">
        <CardContent className="p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Your stats</h2>
            <span className="text-sm text-muted-foreground">View all</span>
          </div>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border sm:h-64">
            <p className="text-sm text-muted-foreground">Chart coming soon</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
