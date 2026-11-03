"use client";

import { Check, ListFilter, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AvatarStack, PersonAvatar } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet";
import { rankPeople } from "@/src/features/people/search";
import { plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { withAllOf, type FilterPlayer } from "./match-players";

/** Past this many players the sheet gets a search box. */
const SEARCH_FROM = 8;

/** The chosen players live in the address, as handles: `?players=ian,jit`. Back from a match comes to the same view. */
const PARAM = "players";
const CHANGED = "players-filter-change";

type Entry = { id: string; playerIds: string[]; card: ReactNode };
type Section = { title: string; entries: Entry[]; editHref: string | false };

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/** The handles in the address. Nothing on the server, so the first paint is unfiltered and the browser then applies it. */
function useChosenHandles(): [string[], (handles: string[]) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const handles = useMemo(() => (new URLSearchParams(search).get(PARAM) ?? "").split(",").filter(Boolean), [search]);
  function set(next: string[]) {
    const url = new URL(window.location.href);
    if (next.length) url.searchParams.set(PARAM, next.join(","));
    else url.searchParams.delete(PARAM);
    // Replace, not push, so Back leaves the page and does not step through every tick. Next keeps its own state in step.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(CHANGED));
  }
  return [handles, set];
}

/**
 * The matches and games of a session with one "Players" filter over both. A match stays whole: its games have the
 * same players, so it is in or out together. A game on its own is a match of one. A card stays when every chosen
 * player is in it, and stays in its own section. Each card comes ready drawn from the server, so a filter only hides.
 */
export function PlayerFilteredResults({ people, matches, games }: { people: FilterPlayer[]; matches: Section; games: Section }) {
  const [handles, setHandles] = useChosenHandles();
  const [open, setOpen] = useState(false);
  const sections = [matches, games].filter((section) => section.entries.length > 0);
  const all = sections.flatMap((section) => section.entries);
  const chosen = people.filter((p) => handles.includes(p.handle)).map((p) => p.id);
  const picked = people.filter((p) => chosen.includes(p.id));
  const filtering = picked.length > 0;
  const shown = withAllOf(all, chosen);
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id];
    setHandles(people.filter((p) => next.includes(p.id)).map((p) => p.handle));
  };

  return (
    <div className="flex flex-col gap-4">
      {people.length > 1 && all.length > 1 && (
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
                <PlayerSheet
                  people={people}
                  matches={matches.entries}
                  games={games.entries}
                  chosen={chosen}
                  onToggle={toggle}
                  onClear={() => setHandles([])}
                  onDone={() => setOpen(false)}
                />
              )}
            </SheetContent>
          </Sheet>
          {filtering && (
            <button
              type="button"
              aria-label="Clear the player filter"
              onClick={() => setHandles([])}
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground"
            >
              <X aria-hidden className="size-4" strokeWidth={2.5} />
            </button>
          )}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="font-semibold">Nothing with all of them</p>
          <Button type="button" variant="text" size="sm" onClick={() => setHandles([])}>
            Clear filter
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {sections.map((section) => {
            const kept = withAllOf(section.entries, chosen);
            if (kept.length === 0) return null;
            return (
              <section key={section.title} aria-labelledby={`${section.title}-heading`} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 id={`${section.title}-heading`} className="section-title">
                    {section.title}
                    {filtering && <span className="ml-2 text-subhead font-medium text-muted-foreground">{kept.length}</span>}
                  </h2>
                  {section.editHref && (
                    <Button asChild variant="text" size="sm">
                      <Link href={section.editHref}>Edit</Link>
                    </Button>
                  )}
                </div>
                <ul className="flex flex-col gap-3">
                  {kept.map((entry) => (
                    <li key={entry.id}>{entry.card}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "3 matches · 4 games", leaving out a part that is none. A game on its own is a game, never also a match, so nothing counts twice. */
function breakdown(matches: number, games: number, joiner: string) {
  return [matches > 0 ? plural(matches, "match", "matches") : null, games > 0 ? plural(games, "game") : null].filter(Boolean).join(joiner);
}

/** Tick the people. The list behind updates at once, and each row says how many matches and games it would leave. */
function PlayerSheet({
  people,
  matches,
  games,
  chosen,
  onToggle,
  onClear,
  onDone,
}: {
  people: FilterPlayer[];
  matches: Entry[];
  games: Entry[];
  chosen: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const listed = rankPeople(people, query.trim());
  const left = { matches: withAllOf(matches, chosen).length, games: withAllOf(games, chosen).length };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Players</SheetTitle>
        <SheetDescription>Show only the matches and games all of the ticked players are in.</SheetDescription>
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
            const count = on
              ? left
              : { matches: withAllOf(matches, [...chosen, person.id]).length, games: withAllOf(games, [...chosen, person.id]).length };
            const none = count.matches + count.games === 0;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggle(person.id)}
                  className={cn("pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left", none && !on && "opacity-50")}
                >
                  <PersonAvatar person={person} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{person.displayName}</span>
                    <span className="block truncate text-sm text-muted-foreground">{none ? "None together" : breakdown(count.matches, count.games, " · ")}</span>
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
          {chosen.length === 0 ? "Done" : left.matches + left.games === 0 ? "No results" : `Show ${breakdown(left.matches, left.games, " and ")}`}
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
