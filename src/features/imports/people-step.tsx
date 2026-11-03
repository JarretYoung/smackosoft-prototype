"use client";

import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import type { Account } from "@/src/contract";
import { Footer } from "@/src/features/imports/footer";
import { guestsFromFile, whoIsWho, type Resolved } from "@/src/features/imports/import-input";
import { NameScreen } from "@/src/features/imports/name-screen";
import { nameFacts } from "@/src/features/imports/suggestions";
import type { useImportFlow } from "@/src/features/imports/use-import-flow";
import { plural } from "@/src/lib/format";

type Flow = ReturnType<typeof useImportFlow>;

/** What the row says under the name: who it is, and which names in the file it came from. */
function importedFrom(person: Resolved, viewerId: string) {
  const from = `imported from “${person.names.join(", ")}”`;
  if (!person.account) return `${from[0].toUpperCase()}${from.slice(1)}`;
  const who = person.account.id === viewerId ? "You" : person.account.isGuest ? "Guest" : `@${person.handle}`;
  return `${who} • ${from}`;
}

/**
 * Say who each name in the file is, one name at a time. The app asks only about the names it cannot place: the ones
 * that start as new guests, most games first. Names it matched to someone you know are not asked about. At the end a
 * review lists every name, and any can be opened again.
 */
export function PeopleStep({ flow, known, viewerId }: { flow: Flow; known: Account[]; viewerId: string }) {
  const { names, choices, set } = flow;
  const facts = useMemo(() => new Map(names.map((name) => [name, nameFacts(set.rows, name)])), [names, set.rows]);
  const games = (name: string) => facts.get(name)?.games ?? 0;
  // The names not yet asked about that start as guests. Fixed when the step opens, so choosing a name does not take it out of the line while it is on screen.
  const [queue] = useState(() =>
    names.filter((name) => choices[name]?.kind === "guest" && !flow.asked.includes(name)).toSorted((a, b) => games(b) - games(a)),
  );
  const [at, setAt] = useState(0);
  // The names of the person being changed from the review, opened one after another.
  const [editing, setEditing] = useState<{ names: string[]; at: number } | null>(null);

  function screen(name: string, position: { at: number; of: number } | null, nextLabel: string, done: () => void, back: () => void) {
    return (
      <NameScreen
        key={name}
        name={name}
        position={position}
        facts={facts.get(name)!}
        current={choices[name]}
        people={known}
        viewerId={viewerId}
        sameAs={guestsFromFile(name, names, choices)}
        nextLabel={nextLabel}
        onChoose={(choice) => {
          flow.setChoice(name, choice);
          done();
        }}
        onAdvance={done}
        onBack={back}
      />
    );
  }

  if (at < queue.length) {
    const last = at + 1 === queue.length;
    return screen(
      queue[at],
      { at: at + 1, of: queue.length },
      last ? "Done" : "Next",
      () => {
        flow.markAsked(queue[at]);
        setAt(at + 1);
      },
      () => (at === 0 ? flow.setStep("file") : setAt(at - 1)),
    );
  }
  if (editing !== null) {
    const last = editing.at + 1 === editing.names.length;
    const move = (to: number) => setEditing(to < 0 || to >= editing.names.length ? null : { ...editing, at: to });
    return screen(editing.names[editing.at], null, last ? "Done" : "Next", () => move(editing.at + 1), () => move(editing.at - 1));
  }

  const people = whoIsWho(names, choices, games);
  // A guest made earlier is someone the app already knows, so it is linked like a friend. Only the guests this import makes are new.
  const linked = people.filter((person) => person.account);
  const guests = people.filter((person) => !person.account);
  const groups = [
    { title: "Linked to people", people: linked },
    { title: "New guests", people: guests },
  ].filter((group) => group.people.length > 0);
  return (
    <>
      <div className="flex flex-col gap-1 px-1">
        <h2 className="section-title">Who is who?</h2>
        <p className="text-subhead text-muted-foreground">
          {linked.length} linked to people, {plural(guests.length, "new guest")}. Tap a person to change who a name is.
        </p>
      </div>

      <div className="group-list">
        <button type="button" onClick={() => flow.setStep("file")} className="pressable-row list-row w-full text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <FileText aria-hidden className="size-4" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body">Files</span>
            <span className="block truncate text-sm text-muted-foreground">{flow.files.map((file) => file.name).join(", ")}</span>
          </span>
          <RowChevron />
        </button>
      </div>

      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
          <h3 className="section-label">{group.title}</h3>
          <ul className="group-list">
            {group.people.map((person) => (
              <li key={person.names[0]}>
                <button type="button" onClick={() => setEditing({ names: person.names, at: 0 })} className="pressable-row list-row min-h-16 w-full text-left">
                  <PersonAvatar person={{ id: person.names[0], displayName: person.displayName, avatarUrl: person.avatarUrl }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold tracking-tight">{person.displayName}</span>
                    <span className="block truncate text-sm text-muted-foreground">{importedFrom(person, viewerId)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{plural(person.games, "game")}</span>
                  <RowChevron />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Footer>
        <Button type="button" size="lg" className="w-full" onClick={flow.preview}>
          Check the import
        </Button>
        <Button type="button" variant="ghost" onClick={() => flow.setStep("file")}>
          Back
        </Button>
      </Footer>
    </>
  );
}
