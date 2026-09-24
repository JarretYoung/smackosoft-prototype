import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Ellipsis,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Primary navigation tiles. Each destination is a placeholder page for now. */
const QUICK_ACTIONS: readonly {
  label: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { label: "Friends", href: "/friends", icon: UsersRound },
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Booking", href: "/booking", icon: CalendarDays },
  { label: "Review", href: "/review", icon: ClipboardList },
  { label: "More", href: "/more", icon: Ellipsis },
];

/**
 * Row of circular shortcut buttons. The circles are sized from the column
 * width (`aspect-square` on a full-width element) so all four stay on one row
 * and shrink with the viewport, capped at `max-w-24` so they don't balloon on
 * wide desktops. Labels sit under the circles rather than inside them, which
 * keeps them readable at phone widths.
 */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-5 gap-2 sm:gap-4">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden="true"
                className="flex aspect-square w-full max-w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-colors group-hover:bg-secondary"
              >
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
              </span>
              <span className="text-center text-xs font-medium sm:text-sm">
                {action.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
