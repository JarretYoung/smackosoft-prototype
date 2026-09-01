"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/src/lib/utils";

/**
 * The home-screen designs currently being pitched. Add an entry here and the
 * switcher picks it up; nothing else needs to change.
 */
const DESIGN_VERSIONS = [
  { label: "V1", href: "/", description: "Original home screen" },
  { label: "V2", href: "/v2", description: "shadcn home screen" },
];

/**
 * Segmented control for jumping between the competing home-screen designs.
 * Lives on every design so a reviewer can flip back and forth mid-pitch.
 *
 * Client component: it reads the current route to mark the active segment.
 */
export function DesignVersionSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Home screen design"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {DESIGN_VERSIONS.map((version) => {
        const isActive = pathname === version.href;

        return (
          <Link
            key={version.href}
            href={version.href}
            title={version.description}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {version.label}
          </Link>
        );
      })}
    </nav>
  );
}
