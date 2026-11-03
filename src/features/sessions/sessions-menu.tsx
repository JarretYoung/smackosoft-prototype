"use client";

import { FileUp, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";

/** The "..." menu on the Sessions page: things that act on the whole calendar, not on one session. */
export function SessionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Sessions menu">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
        <DropdownMenuItem asChild>
          <Link href="/import">
            <FileUp />
            Import games
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
