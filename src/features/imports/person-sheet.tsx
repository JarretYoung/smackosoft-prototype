"use client";

import { Search, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { HandleHint, handleProblem } from "@/src/components/handle-hint";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import type { Account } from "@/src/contract";
import { findByHandle } from "@/src/features/accounts/actions";
import type { Choice, guestsFromFile } from "@/src/features/imports/import-input";
import { normalizeHandle, useHandleCheck } from "@/src/hooks/use-handle-check";
import { errorMessage } from "@/src/lib/errors";

/**
 * Say who a name from the file is: someone you know or can find by handle, or a guest the import creates.
 * Picking someone applies at once. The guest form has its own button, because it takes two fields.
 */
export function PersonSheet({
  name,
  current,
  people,
  fromFile,
  onChoose,
  onClose,
}: {
  /** The name from the file. Null keeps the sheet closed. */
  name: string | null;
  current: Choice | undefined;
  /** Teammates and guests the viewer already knows. */
  people: Account[];
  /** New guests picked for the other names, so this name can be set to the same one. */
  fromFile: ReturnType<typeof guestsFromFile>;
  onChoose: (choice: Choice) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={name !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="overflow-y-auto">
        {name !== null && <Body name={name} current={current} people={people} fromFile={fromFile} onChoose={onChoose} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  name,
  current,
  people,
  fromFile,
  onChoose,
}: {
  name: string;
  current: Choice | undefined;
  people: Account[];
  fromFile: ReturnType<typeof guestsFromFile>;
  onChoose: (choice: Choice) => void;
}) {
  const [query, setQuery] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();
  const guest = current?.kind === "guest" ? current : null;
  const [displayName, setDisplayName] = useState(guest?.displayName ?? name);
  const [handle, setHandle] = useState(guest?.handle ?? "");
  const [left, setLeft] = useState(false);

  const text = query.trim();
  const wanted = normalizeHandle(text);
  const matches = text
    ? people.filter((p) => p.displayName.toLowerCase().includes(text.toLowerCase()) || p.handle.includes(wanted))
    : people;
  const canLookup = text.startsWith("@") && /^[a-z0-9_]{3,30}$/.test(wanted) && !people.some((p) => p.handle === wanted);

  function lookup() {
    setLookupError(null);
    startLookup(async () => {
      const result = await findByHandle({ handle: wanted });
      if (!result.ok) return void setLookupError(errorMessage(result.error));
      if (!result.data) return void setLookupError(`No one has the handle @${wanted}`);
      onChoose({ kind: "account", account: result.data });
    });
  }

  const check = useHandleCheck(handle);
  const problem = handleProblem(check, left);
  const guestReady = displayName.trim() !== "" && check.status === "free";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pb-6">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Who is {name}?</SheetTitle>
        <SheetDescription>Pick someone you play with, find them by handle, or keep them as a guest.</SheetDescription>
      </SheetHeader>

      <form
        className="flex min-h-0 flex-col gap-3 px-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches.length === 1) onChoose({ kind: "account", account: matches[0] });
          else if (matches.length === 0 && canLookup) lookup();
        }}
      >
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search people"
            placeholder="Search, or type @handle"
            value={query}
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
        {(matches.length > 0 || canLookup) && (
          <ul className="group-list max-h-56 overflow-y-auto border border-border/60 shadow-none">
            {matches.map((person) => {
              const on = current?.kind === "account" && current.account.id === person.id;
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChoose({ kind: "account", account: person })}
                    className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <PersonAvatar person={person} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{person.displayName}</span>
                      <span className="block truncate text-sm text-muted-foreground">{person.isGuest ? "Guest" : `@${person.handle}`}</span>
                    </span>
                    {on && <span className="text-sm font-semibold text-primary">Chosen</span>}
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
                  Find @{wanted}
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
      </form>

      {fromFile.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border/60 px-5 pt-5">
          <h3 className="text-subhead font-semibold">Same as a guest in this file</h3>
          <ul className="group-list border border-border/60 shadow-none">
            {fromFile.map(({ name: other, choice }) => {
              const on = guest?.handle === choice.handle;
              return (
                <li key={choice.handle}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChoose(choice)}
                    className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <PersonAvatar person={{ id: other, displayName: choice.displayName, avatarUrl: null }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{choice.displayName}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        As {other}, @{choice.handle}
                      </span>
                    </span>
                    {on && <span className="text-sm font-semibold text-primary">Chosen</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form
        className="flex flex-col gap-3 border-t border-border/60 px-5 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (guestReady) onChoose({ kind: "guest", displayName: displayName.trim(), handle: normalizeHandle(handle) });
        }}
      >
        <h3 className="flex items-center gap-2 text-subhead font-semibold">
          <UserPlus aria-hidden className="size-4" /> Or keep as a guest
        </h3>
        <Field>
          <FieldLabel htmlFor="import-guest-name">Display name</FieldLabel>
          <Input id="import-guest-name" value={displayName} autoComplete="off" onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field data-invalid={!!problem}>
          <FieldLabel htmlFor="import-guest-handle">Handle</FieldLabel>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg font-semibold text-muted-foreground">
              @
            </span>
            <Input
              id="import-guest-handle"
              value={handle}
              placeholder={guest?.handle ?? name.toLowerCase()}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={!!problem}
              onChange={(e) => setHandle(e.target.value)}
              onBlur={() => setLeft(true)}
            />
          </div>
          <FieldError>{problem}</FieldError>
          <HandleHint check={check} handle={normalizeHandle(handle)} />
        </Field>
        <Button type="submit" size="lg" disabled={!guestReady}>
          Use guest
        </Button>
      </form>
    </div>
  );
}
