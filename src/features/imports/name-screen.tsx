"use client";

import { ChevronDown, Search, UserPlus } from "lucide-react";
import { FindHandleRow } from "@/src/features/people/find-handle-row";
import { useMemo, useState } from "react";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { Account } from "@/src/contract";
import { Footer } from "@/src/features/imports/footer";
import { GuestDetails } from "@/src/features/imports/guest-details";
import type { Choice, guestsFromFile } from "@/src/features/imports/import-input";
import { byLikeness, likeness, listOf, playedBetween, type NameFacts } from "@/src/features/imports/suggestions";
import { fit } from "@/src/features/people/search";
import { usePersonSearch } from "@/src/features/people/use-person-search";
import { guestHandle, randomSuffix } from "@/src/lib/guest";
import { plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

type GuestChoice = Extract<Choice, { kind: "guest" }>;

/** How many people to offer before anything is typed. The rest are one search away. */
const OFFERED = 5;

/**
 * Say who one name from the file is. It is the familiar people search (a name narrows the list, "@handle" looks
 * someone up), with the likeliest people first, and the other names in the file as people it could be the same as.
 * Tapping a person chooses them and moves on. "Next" keeps what is chosen, which starts as a new guest.
 */
export function NameScreen({
  name,
  position,
  facts,
  current,
  people,
  viewerId,
  sameAs,
  nextLabel,
  onChoose,
  onAdvance,
  onBack,
}: {
  name: string;
  /** Which name this is of how many, or null when one name is opened again from the review. */
  position: { at: number; of: number } | null;
  facts: NameFacts;
  current: Choice | undefined;
  /** Teammates and guests the viewer already knows, most used first. */
  people: Account[];
  /** The signed in person, shown as "You". */
  viewerId: string;
  /** The other names in the file still kept as new guests, one per guest, so this name can be the same as one. */
  sameAs: ReturnType<typeof guestsFromFile>;
  nextLabel: string;
  onChoose: (choice: Choice) => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  // The guest made for this name when nothing else is chosen. Made once, so its handle does not change as the screen redraws.
  const [fresh] = useState<GuestChoice>(() => ({ kind: "guest", displayName: name, handle: guestHandle(name) }));
  const [suffix] = useState(randomSuffix);
  const guest = current?.kind === "guest" ? current : null;
  const ordered = useMemo(() => byLikeness(people, name), [people, name]);
  const search = usePersonSearch(ordered);
  const [details, setDetails] = useState(false);

  const typed = search.text !== "";
  // A name typed in the search is the guest's name, as in the people picker, and its handle follows it.
  const typedName = typed && !search.text.startsWith("@");
  const own: GuestChoice = typedName ? { kind: "guest", displayName: search.text, handle: guestHandle(search.text, suffix) } : (guest ?? fresh);
  const likely = !typed && search.matches.some((p) => likeness(name, p) < 3);
  const shown = typed ? search.matches : search.matches.slice(0, OFFERED);
  const more = typed ? 0 : search.matches.length - shown.length;
  const alike = sameAs.filter(({ name: other }) => {
    const as = { displayName: other, handle: other.toLowerCase() };
    return typed ? fit(as, search.text) !== null : likeness(name, as) < 3;
  });
  const aliasChosen = (choice: GuestChoice) => guest?.handle === choice.handle;

  function findHandle() {
    search.lookup((found) => {
      onChoose({ kind: "account", account: found });
      return null;
    });
  }

  // Enter does the likeliest thing: choose the one match, or look up an explicit @handle.
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (search.matches.length === 1) onChoose({ kind: "account", account: search.matches[0] });
    else if (search.matches.length === 0 && search.text.startsWith("@") && search.canLookup) findHandle();
  }

  const where = [
    plural(facts.games, "game"),
    playedBetween(facts),
  ].filter(Boolean).join(", ");
  const often = facts.withNames.length ? `Often with ${listOf(facts.withNames)}` : facts.againstNames.length ? `Often against ${listOf(facts.againstNames)}` : "";

  return (
    <>
      <div className="flex flex-col gap-3 px-1">
        {position && (
          <div className="flex flex-col gap-2">
            <p className="section-label">
              Name {position.at} of {position.of}
            </p>
            <div
              role="progressbar"
              aria-label="Names"
              aria-valuemin={1}
              aria-valuemax={position.of}
              aria-valuenow={position.at}
              className="h-1 overflow-hidden rounded-full bg-border/60"
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(position.at / position.of) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h2 className="section-title">Who is {name}?</h2>
          <p className="text-subhead text-muted-foreground">
            {where}
            {often && (
              <>
                <br />
                {often}
              </>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search people"
            placeholder="Search, or type @handle"
            value={search.query}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => search.setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {(shown.length > 0 || search.canLookup) && (
          <section aria-labelledby="people-heading" className="flex flex-col gap-2">
            <h3 id="people-heading" className="section-label">
              {typed ? "Results" : likely ? "Possible matches" : "People you play with"}
            </h3>
            <ul className="group-list">
              {shown.map((person) => (
                <li key={person.id}>
                  <Row
                    avatar={<PersonAvatar person={person} />}
                    title={person.displayName}
                    subtitle={person.id === viewerId ? "You" : person.isGuest ? "Guest" :`@${person.handle}`}
                    chosen={current?.kind === "account" && current.account.id === person.id}
                    onPick={() => onChoose({ kind: "account", account: person })}
                  />
                </li>
              ))}
              {search.canLookup && (
                <li>
                  <FindHandleRow handle={search.handle} looking={search.looking} error={search.lookupError} onFind={findHandle} />
                </li>
              )}
            </ul>
            {more > 0 && <p className="px-1 text-sm text-muted-foreground">Search to see {plural(more, "more person", "more people")}.</p>}
          </section>
        )}
      </form>

      <section aria-labelledby="or-heading" className="flex flex-col gap-2">
        <h3 id="or-heading" className="section-label">
          Or
        </h3>
        <ul className="group-list">
          <li>
            <Row
              avatar={
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
                  <UserPlus aria-hidden className="size-4" />
                </span>
              }
              title={`Add “${own.displayName}” as a guest`}
              subtitle="Guest"
              chosen={guest !== null && (typedName ? guest.handle === own.handle : !sameAs.some(({ choice }) => aliasChosen(choice)))}
              onPick={() => onChoose(own)}
            />
          </li>
          {alike.map(({ name: other, choice }) => (
            <li key={choice.handle}>
              <Row
                avatar={<PersonAvatar person={{ id: other, displayName: choice.displayName, avatarUrl: null }} />}
                title={`Same person as ${other}`}
                subtitle="Another name in this file"
                chosen={aliasChosen(choice)}
                onPick={() => onChoose(choice)}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-expanded={details}
          onClick={() => setDetails((open) => !open)}
          className="flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-primary"
        >
          Edit guest details
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", details && "rotate-180")} strokeWidth={2.5} />
        </button>
        {details && <GuestDetails key={`${own.displayName}/${own.handle}`} current={own} onUse={onChoose} />}
      </section>

      <Footer>
        <Button type="button" size="lg" className="w-full" onClick={onAdvance}>
          {nextLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
      </Footer>
    </>
  );
}

function Row({ avatar, title, subtitle, chosen, onPick }: { avatar: React.ReactNode; title: string; subtitle: string; chosen: boolean; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={chosen} onClick={onPick} className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
      </span>
      {chosen && <span className="text-sm font-semibold text-primary">Chosen</span>}
    </button>
  );
}
