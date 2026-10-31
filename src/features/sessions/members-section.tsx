"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { AddRow } from "@/src/components/add-row";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { Account, Role } from "@/src/contract";
import { ROLE_CAN, ROLE_LABEL } from "@/src/features/sessions/roles";
import { AddMembersSheet } from "./add-members-sheet";
import type { SessionFormState } from "./use-session-form";

/** The staged members, each with a menu to change the role or remove them. */
export function MembersSection({ session, people }: { session: SessionFormState; people: Account[] }) {
  const { values, changeMembers, removeMember, canGrantManager } = session;
  const [adding, setAdding] = useState(false);

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-2">
      <h2 id="members-heading" className="section-label">
        Members
      </h2>
      <ul className="group-list">
        {values.members.map((p) => (
          <li key={p.account.id} className="list-row">
            <PersonAvatar person={p.account} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold tracking-tight">
                {p.account.isGuest && <span className="font-normal text-muted-foreground">(Guest) </span>}
                {p.account.displayName}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {ROLE_LABEL[p.role]}
                {p.isPlayer && <Badge variant="tinted">Player</Badge>}
              </p>
            </div>
            {p.role !== "OWNER" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="bare" size="icon" className="text-muted-foreground" aria-label={`Options for ${p.account.displayName}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Change role</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={p.role}
                    onValueChange={(role) => changeMembers({ type: "role", id: p.account.id, role: role as Role })}
                  >
                    {(["VIEWER", "EDITOR", "MANAGER"] as const)
                      .filter((role) => role !== "MANAGER" || canGrantManager || p.role === "MANAGER")
                      .map((role) => (
                        <DropdownMenuRadioItem key={role} value={role} disabled={role === "MANAGER" && !canGrantManager}>
                          <span className="flex flex-col">
                            {ROLE_LABEL[role]}
                            <span className="text-xs text-muted-foreground">{ROLE_CAN[role]}</span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => removeMember(p)}>
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
        <li>
          <AddRow onClick={() => setAdding(true)}>Add member</AddRow>
        </li>
      </ul>

      <AddMembersSheet
        open={adding}
        onOpenChange={setAdding}
        people={people}
        existingIds={new Set(values.members.map((p) => p.account.id))}
        onConfirm={(accounts) => changeMembers({ type: "add", accounts })}
      />
    </section>
  );
}
