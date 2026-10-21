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

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href === "/sessions" && pathname.startsWith("/sessions/") && pathname !== "/sessions/new");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t bg-card/95 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {tabs.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
            isActive(href) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
      <Link
        href="/sessions/new"
        aria-label="New session"
        className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="size-6" />
      </Link>
    </nav>
  );
}
