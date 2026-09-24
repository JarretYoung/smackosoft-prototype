import Link from "next/link";

import { Card, CardContent } from "@/src/components/ui/card";

/**
 * Placeholder feed of what friends have been playing. The rows are empty
 * skeletons until match data and the friends graph exist; the card as a whole
 * links through to the friends page.
 */
export function FriendActivityCard() {
  const placeholderRows = [0, 1, 2];

  return (
    <Link
      href="/friends"
      aria-label="View friend activity"
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors hover:bg-secondary">
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Friend activity</h2>
            <span className="text-sm text-muted-foreground">View all</span>
          </div>

          <ul className="flex flex-col gap-3">
            {placeholderRows.map((row) => (
              <li key={row} className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-full bg-secondary/50"
                />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-2/5 rounded bg-secondary/50" />
                  <div className="mt-1.5 h-3 w-3/5 rounded bg-secondary/30" />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-auto pt-4 text-sm text-muted-foreground">
            No activity yet — add friends to see their matches here.
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
