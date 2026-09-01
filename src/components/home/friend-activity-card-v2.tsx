import Link from "next/link";

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";
import { Skeleton } from "@/src/components/ui/skeleton";

/**
 * V2 friend activity feed. Rows are shadcn Skeletons standing in for real
 * entries. Unlike V1 the card itself is not a link — the explicit "View all"
 * button is the only click target, which keeps the interactive area obvious.
 */
export function FriendActivityCardV2() {
  const placeholderRows = [0, 1, 2];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Friend activity</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/friends">View all</Link>
          </Button>
        </div>

        <ul className="flex flex-col">
          {placeholderRows.map((row, index) => (
            <li key={row}>
              {index > 0 && <Separator className="my-3" />}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary/50" />
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/5 bg-secondary/40" />
                  <Skeleton className="h-3 w-3/5 bg-secondary/25" />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-auto pt-4 text-sm text-muted-foreground">
          No activity yet — add friends to see their matches here.
        </p>
      </CardContent>
    </Card>
  );
}
