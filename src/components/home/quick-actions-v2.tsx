import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Ellipsis,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";

/** Same destinations as V1, presented as shadcn Buttons. */
const QUICK_ACTIONS: readonly {
  label: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Booking", href: "/booking", icon: CalendarDays },
  { label: "Review", href: "/review", icon: ClipboardList },
  { label: "More", href: "/more", icon: Ellipsis },
];

/**
 * V2 shortcut row. Still four circles, but built on the shadcn Button (so it
 * inherits the shared focus, hover and disabled treatment) and filled with the
 * secondary accent rather than the card colour, which makes the row read as
 * the primary call to action on the page.
 */
export function QuickActionsV2() {
  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-4 gap-2 sm:gap-4">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.href} className="flex flex-col items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="h-auto w-full max-w-24 rounded-full p-0 [&_svg]:size-auto"
            >
              <Link href={action.href} aria-label={action.label}>
                <span className="flex aspect-square w-full items-center justify-center">
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                </span>
              </Link>
            </Button>
            <span className="text-center text-xs font-medium sm:text-sm">
              {action.label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
