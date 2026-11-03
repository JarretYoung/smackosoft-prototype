"use client";

import { Check, ListFilter, Search, X } from "lucide-react";
import { useState } from "react";
import { AvatarStack, PersonAvatar } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet";
import { rankPeople } from "@/src/features/people/search";
import { useUrlParam } from "@/src/hooks/use-url-param";
import { plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import type { FilterPlayer } from "./match-players";

/** Past this many players the sheet gets a search box. */
const SEARCH_FROM = 8;

/** What ticking some players would leave, in words: under a name, and on the button that closes the sheet. */
export type Leaves = { line: string; show: string; none: boolean };

/** The chosen players live in the address, as handles: `?players=ian,jit`. Back from a match comes to the same view. */
export function useChosenPlayers(people: FilterPlayer[]) {
  const [param, setParam] = useUrlParam("players");
  const handles = param.split(",").filter(Boolean);
  const chosen = people.filter((p) => handles.includes(p.handle)).map((p) => p.id);
  const set = (ids: string[]) => setParam(people.filter((p) => ids.includes(p.id)).map((p) => p.handle).join(","));
  return {
    chosen,
    picked: people.filter((p) => chosen.includes(p.id)),
    toggle: (id: string) => set(chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id]),
    clear: () => setParam(""),
  };
}

/**
 * "Filter by player", a row like Members and Videos. It opens a sheet where people are ticked, with what each would leave.
 * Idle it says "Everyone". With people ticked the disc turns solid red and their avatars show, with a × to clear.
 */
export function PlayerFilterRow({
  people,
  chosen,
  picked,
  describe,
  description,
  onToggle,
  onClear,
}: {
  people: FilterPlayer[];
  chosen: string[];
  picked: FilterPlayer[];
  /** What ticking these people leaves. */
  describe: (ids: string[]) => Leaves;
  description: string;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filtering = picked.length > 0;

  return (
    <div className="group-list">
      {/* One child, because a group list draws a line above every child after the first. */}
      <div className="flex items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" className="pressable-row list-row min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-[1.125rem]",
                  filtering ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                )}
              >
                <ListFilter aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-footnote text-muted-foreground">Filter by player</span>
                {filtering ? (
                  <span className="mt-1 flex items-center gap-2">
                    <AvatarStack people={picked} max={4} />
                    <span className="text-sm text-muted-foreground">{plural(picked.length, "player")}</span>
                  </span>
                ) : (
                  <span className="mt-0.5 block text-body">Everyone</span>
                )}
              </span>
              {!filtering && <RowChevron />}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="overflow-y-auto">
            {open && (
              <PlayerSheet people={people} chosen={chosen} describe={describe} description={description} onToggle={onToggle} onClear={onClear} onDone={() => setOpen(false)} />
            )}
          </SheetContent>
        </Sheet>
        {filtering && (
          <button type="button" aria-label="Clear the player filter" onClick={onClear} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Tick the people. The list behind updates at once, and each row says what it would leave. */
function PlayerSheet({
  people,
  chosen,
  describe,
  description,
  onToggle,
  onClear,
  onDone,
}: {
  people: FilterPlayer[];
  chosen: string[];
  describe: (ids: string[]) => Leaves;
  description: string;
  onToggle: (id: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const listed = rankPeople(people, query.trim());
  const left = describe(chosen);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Players</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-col gap-3 px-5">
        {people.length >= SEARCH_FROM && (
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search players"
              placeholder="Search players"
              value={query}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        <ul className="group-list max-h-72 overflow-y-auto border border-border/60 shadow-none">
          {listed.map((person) => {
            const on = chosen.includes(person.id);
            const leaves = on ? left : describe([...chosen, person.id]);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggle(person.id)}
                  className={cn("pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left", leaves.none && !on && "opacity-50")}
                >
                  <PersonAvatar person={person} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{person.displayName}</span>
                    <span className="block truncate text-sm text-muted-foreground">{leaves.none ? "None together" : leaves.line}</span>
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
          {listed.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No one by that name</li>}
        </ul>
      </div>

      <SheetFooter className="px-5 pb-6">
        <Button type="button" size="lg" onClick={onDone}>
          {chosen.length === 0 ? "Done" : left.none ? "No results" : `Show ${left.show}`}
        </Button>
        {chosen.length > 0 && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        )}
      </SheetFooter>
    </div>
  );
}
