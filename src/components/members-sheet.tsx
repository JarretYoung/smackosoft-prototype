"use client";

import { useState, type ReactNode } from "react";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import type { Member } from "@/src/contract";
import { plural } from "@/src/lib/format";
import { ROLE_LABEL } from "@/src/lib/roles";

/**
 * A row that opens a read-only list of the session's members. For people who cannot edit them.
 * Managers get a link to the edit screen instead.
 */
export function MembersSheetRow({ members, children }: { members: Member[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="pressable-row list-row w-full text-left">
        {children}
        <RowChevron />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="overflow-y-auto pb-6">
          <SheetHeader>
            <SheetTitle>Members</SheetTitle>
            <SheetDescription>{plural(members.length, "person", "people")} in this session.</SheetDescription>
          </SheetHeader>
          <ul className="group-list mx-5">
            {members.map((member) => (
              <li key={member.id} className="list-row">
                <PersonAvatar person={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold tracking-tight">{member.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[ROLE_LABEL[member.role], member.isPlayer && "Player", member.isGuest && "Guest"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
