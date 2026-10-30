"use client";

import { Check, Search, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { findByHandle } from "@/src/features/accounts/actions";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import type { Account } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { guestHandle } from "@/src/lib/guest";
import { cn } from "@/src/lib/utils";

/** A guest that does not exist yet. It is created when the session is saved. */
export type NewGuest = Account & { isNew: true };

type Person = Account | NewGuest;

/**
 * Stage people to add. Tap the people you play with, or search: by name to narrow the list,
 * by handle to find someone new, or type a name to make a guest. Nothing is saved here.
 * The parent decides what to do on confirm.
 */
export function AddMembersSheet({
  open,
  onOpenChange,
  people,
  existingIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suggestions: teammates and guests the viewer already knows. */
  people: Account[];
  existingIds: Set<string>;
  onConfirm: (accounts: Person[]) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        {open && (
          <Picker
            people={people}
            existingIds={existingIds}
            onCancel={() => onOpenChange(false)}
            onConfirm={(chosen) => {
              onConfirm(chosen);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Picker({
  people,
  existingIds,
  onCancel,
  onConfirm,
}: {
  people: Account[];
  existingIds: Set<string>;
  onCancel: () => void;
  onConfirm: (chosen: Person[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Person[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, start] = useTransition();

  const text = query.trim();
  const handle = text.replace(/^@/, "").toLowerCase();
  const isChosen = (id: string) => chosen.some((p) => p.id === id);
  const toggle = (person: Person) =>
    setChosen((list) => (list.some((p) => p.id === person.id) ? list.filter((p) => p.id !== person.id) : [...list, person]));

  // Newly found people and guests lead the list, so what you just added is never out of sight.
  const suggestedIds = new Set(people.map((p) => p.id));
  const all: Person[] = [...chosen.filter((p) => !suggestedIds.has(p.id)), ...people].filter((p) => !existingIds.has(p.id));
  const matches = text
    ? all.filter((p) => p.displayName.toLowerCase().includes(text.toLowerCase()) || p.handle.includes(handle))
    : all;

  const canLookup = /^[a-z0-9_]{3,30}$/.test(handle) && !all.some((p) => p.handle === handle) && !existingIds.has(handle);
  const canMakeGuest = text !== "" && !text.startsWith("@") && !all.some((p) => p.displayName.toLowerCase() === text.toLowerCase());

  function lookup() {
    setLookupError(null);
    start(async () => {
      const result = await findByHandle({ handle });
      if (!result.ok) return void setLookupError(errorMessage(result.error));
      const found = result.data;
      if (!found) return void setLookupError(`No one has the handle @${handle}`);
      if (existingIds.has(found.id)) return void setLookupError(`${found.displayName} is already in this session`);
      if (!isChosen(found.id)) toggle(found);
      setQuery("");
    });
  }

  function makeGuest() {
    toggle({ id: crypto.randomUUID(), displayName: text, handle: guestHandle(text), avatarUrl: null, isGuest: true, isNew: true });
    setQuery("");
  }

  // Enter does the most likely thing: pick the one match, look up an explicit @handle, else make a guest.
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (matches.length === 1) {
      toggle(matches[0]);
      setQuery("");
    } else if (matches.length === 0 && text.startsWith("@") && canLookup) lookup();
    else if (matches.length === 0 && canMakeGuest) makeGuest();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Add members</SheetTitle>
        <SheetDescription>Pick people you have played with, or search by name or handle.</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-col gap-3 px-5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search people"
            placeholder="Search or type a name"
            value={query}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => {
              setQuery(e.target.value);
              setLookupError(null);
            }}
            className="pl-10"
          />
        </div>

        {(matches.length > 0 || canLookup || canMakeGuest) && (
          <ul className="group-list max-h-64 overflow-y-auto border border-border/60 shadow-none">
            {matches.map((person) => {
              const on = isChosen(person.id);
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(person)}
                    className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <PersonAvatar person={person} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{person.displayName}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {person.isGuest ? "Guest" : `@${person.handle}`}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
            {canLookup && (
              <li>
                <button
                  type="button"
                  onClick={lookup}
                  disabled={looking}
                  className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left font-semibold text-primary"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent">
                    {looking ? <Spinner /> : <Search className="size-4" />}
                  </span>
                  Find @{handle}
                </button>
              </li>
            )}
            {canMakeGuest && (
              <li>
                <button
                  type="button"
                  onClick={makeGuest}
                  className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left font-semibold text-primary"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent">
                    <UserPlus className="size-4" />
                  </span>
                  <span className="min-w-0 truncate">Add “{text}” as a guest</span>
                </button>
              </li>
            )}
          </ul>
        )}

        {lookupError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {lookupError}
          </p>
        )}
        {matches.length === 0 && !text && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No one to suggest yet. Type a name to add a guest, or a handle to find a friend.
          </p>
        )}
      </div>

      <SheetFooter className="px-5 pb-6">
        <Button type="button" size="lg" disabled={chosen.length === 0} onClick={() => onConfirm(chosen)}>
          {chosen.length > 0 ? `Add ${chosen.length}` : "Add"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
