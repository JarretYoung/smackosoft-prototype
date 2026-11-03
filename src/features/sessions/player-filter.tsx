"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/button";
import { plural } from "@/src/lib/format";
import { withAllOf, type FilterPlayer } from "./match-players";
import { PlayerFilterRow, useChosenPlayers, type Leaves } from "./player-filter-row";

type Entry = { id: string; playerIds: string[]; card: ReactNode };
type Section = { title: string; entries: Entry[]; editHref: string | false };

/** "3 matches · 4 games", leaving out a part that is none. A game on its own is a game, never also a match, so nothing counts twice. */
function breakdown(matches: number, games: number, joiner: string) {
  return [matches > 0 ? plural(matches, "match", "matches") : null, games > 0 ? plural(games, "game") : null].filter(Boolean).join(joiner);
}

/**
 * The matches and games of a session with one "Players" filter over both. A match stays whole: its games have the
 * same players, so it is in or out together. A game on its own is a match of one. A card stays when every chosen
 * player is in it, and stays in its own section. Each card comes ready drawn from the server, so a filter only hides.
 */
export function PlayerFilteredResults({ people, matches, games }: { people: FilterPlayer[]; matches: Section; games: Section }) {
  const { chosen, picked, toggle, clear } = useChosenPlayers(people);
  const sections = [matches, games].filter((section) => section.entries.length > 0);
  const all = sections.flatMap((section) => section.entries);
  const filtering = picked.length > 0;
  const shown = withAllOf(all, chosen);
  const describe = (ids: string[]): Leaves => {
    const m = withAllOf(matches.entries, ids).length;
    const g = withAllOf(games.entries, ids).length;
    return { line: breakdown(m, g, " · "), show: breakdown(m, g, " and "), none: m + g === 0 };
  };

  return (
    <div className="flex flex-col gap-4">
      {people.length > 1 && all.length > 1 && (
        <PlayerFilterRow
          people={people}
          chosen={chosen}
          picked={picked}
          describe={describe}
          description="Show only the matches and games all of the ticked players are in."
          onToggle={toggle}
          onClear={clear}
        />
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="font-semibold">Nothing with all of them</p>
          <Button type="button" variant="text" size="sm" onClick={clear}>
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
