"use client";

import { CalendarDays, House, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

const tabs = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/sessions", label: "Sessions", Icon: CalendarDays },
  { href: "/profile", label: "Profile", Icon: User },
];

/**
 * Floating tab bar. It is the functional layer, so it uses glass; the content scrolls beneath it.
 * The tabs navigate. "New session" is an action, so it sits apart as its own button.
 */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href === "/sessions" && pathname.startsWith("/sessions/") && pathname !== "/sessions/new");

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass pointer-events-auto flex flex-1 items-center rounded-full p-1.5">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "pressable flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6875rem] font-semibold",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-[1.375rem]" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
      <Link
        href="/sessions/new"
        aria-label="New session"
        className="pressable pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float"
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </Link>
    </nav>
  );
}
