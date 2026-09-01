"use client";

import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { SPORT_LABELS, SPORTS } from "@/src/lib/types/sport";

/**
 * V2 stats block. The chart area is still a placeholder, but it is split per
 * sport with shadcn Tabs — the pitch being that one chart slot can serve every
 * sport instead of needing a separate card each.
 *
 * Client component because Tabs owns the selected-tab state.
 */
export function StatsChartCardV2() {
  return (
    <Card>
      <CardContent className="p-5">
        <Tabs defaultValue={SPORTS[0]}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Your stats</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/stats">View full stats</Link>
            </Button>
          </div>

          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            {SPORTS.map((sport) => (
              <TabsTrigger key={sport} value={sport}>
                {SPORT_LABELS[sport]}
              </TabsTrigger>
            ))}
          </TabsList>

          {SPORTS.map((sport) => (
            <TabsContent key={sport} value={sport}>
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border sm:h-64">
                <p className="text-sm text-muted-foreground">
                  {SPORT_LABELS[sport]} chart coming soon
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
