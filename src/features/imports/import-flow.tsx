"use client";

import { Check, FileUp, Globe } from "lucide-react";
import { useRef, useState } from "react";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { Spinner } from "@/src/components/ui/spinner";
import type { Account, ImportReport } from "@/src/contract";
import { BURNING_MARS_TEMPLATE } from "@/src/features/imports/burning-mars";
import { alsoCalled, guestsFromFile, type Choice } from "@/src/features/imports/import-input";
import { PersonSheet } from "@/src/features/imports/person-sheet";
import { useImportFlow } from "@/src/features/imports/use-import-flow";
import { ZoneSheet } from "@/src/features/sessions/zone-sheet";
import { LeaveLink } from "@/src/hooks/unsaved-changes";
import { dayShort, plural } from "@/src/lib/format";
import { offsetLabel, todayIn, zoneCity } from "@/src/lib/zoned";

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(BURNING_MARS_TEMPLATE)}`;

/**
 * Import games from a file in four steps: choose the file, say who each name is, check what would
 * happen, then import. Nothing is saved before the last step.
 */
export function ImportFlow({ known }: { known: Account[] }) {
  const flow = useImportFlow(known);
  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-32">
      {flow.step === "file" && <FileStep flow={flow} />}
      {flow.step === "people" && <PeopleStep flow={flow} known={known} />}
      {flow.step === "preview" && <PreviewStep flow={flow} />}
      {flow.step === "done" && flow.report && <DoneStep report={flow.report} onAnother={flow.restart} />}
    </div>
  );
}

type Flow = ReturnType<typeof useImportFlow>;

/** The primary action stays in reach however long the page is, as in the match editor. */
function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md flex-col gap-1 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4">
      {children}
    </div>
  );
}

// ------------------------------------------------------------------- 1. file

function FileStep({ flow }: { flow: Flow }) {
  const input = useRef<HTMLInputElement>(null);
  const [zoneOpen, setZoneOpen] = useState(false);
  const { adapted } = flow;
  const problems = adapted?.problems ?? [];
  const ready = adapted !== null && problems.length === 0;
  const sessions = ready ? new Set(adapted.rows.map((r) => `${r.date}\u0000${r.session ?? r.date}`)).size : 0;
  const games = ready ? adapted.rows.filter((r) => r.sides).length : 0;
  const unlinked = ready ? adapted.rows.length - games : 0;

  return (
    <>
      <p className="px-1 text-subhead text-muted-foreground">
        Bring in a list of games and their videos from a file. Each row is one game, or an unlinked video that waits in its session. Nothing is
        saved until you confirm.
      </p>

      <section aria-labelledby="settings-heading" className="flex flex-col gap-2">
        <h2 id="settings-heading" className="section-label">
          Settings
        </h2>
        <div className="group-list">
          <div className="list-row">
            <span className="min-w-0 flex-1 text-body">File format</span>
            <span className="text-subhead text-muted-foreground">BurningMars playlist</span>
          </div>
          <button type="button" onClick={() => setZoneOpen(true)} className="pressable-row list-row w-full text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-body">Time zone for new sessions</span>
              <span className="block text-sm text-muted-foreground">
                {zoneCity(flow.zone)} · {offsetLabel(flow.zone)}
              </span>
            </span>
            <Globe aria-hidden className="size-4 text-muted-foreground" />
            <RowChevron />
          </button>
        </div>
        <ZoneSheet open={zoneOpen} onOpenChange={setZoneOpen} value={flow.zone} date={todayIn(flow.zone)} onChange={flow.setZone} />
      </section>

      <section aria-labelledby="file-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="file-heading" className="section-label">
            Your file
          </h2>
          <a href={TEMPLATE_HREF} download="games-template.csv" className={buttonVariants({ variant: "text", size: "sm" })}>
            Download template
          </a>
        </div>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Choose a CSV file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void flow.chooseFile(file);
            event.target.value = "";
          }}
        />
        <div className="group-list">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 text-left font-semibold text-primary"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
              <FileUp className="size-4" strokeWidth={2.5} />
            </span>
            {flow.fileName ? "Choose a different file" : "Choose a CSV file"}
          </button>
        </div>
        {flow.fileError && (
          <p role="alert" className="px-1 text-sm font-medium text-destructive">
            {flow.fileError}
          </p>
        )}
      </section>

      {adapted && problems.length > 0 && (
        <section aria-labelledby="problems-heading" className="flex flex-col gap-2">
          <h2 id="problems-heading" className="section-label">
            {plural(problems.length, "problem")} in {flow.fileName}
          </h2>
          <ul role="alert" className="group-list">
            {problems.slice(0, 20).map((p, index) => (
              <li key={index} className="list-row items-start">
                <span className="w-16 shrink-0 text-sm font-semibold text-destructive">Line {p.line}</span>
                <span className="min-w-0 flex-1 text-sm">{p.message}</span>
              </li>
            ))}
          </ul>
          {problems.length > 20 && <p className="px-1 text-sm text-muted-foreground">And {problems.length - 20} more. Fix these first.</p>}
        </section>
      )}

      {ready && (
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card" aria-live="polite">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <p className="text-subhead">
            <span className="font-semibold">{flow.fileName}</span> has {plural(games, "game")}
            {unlinked > 0 && ` and ${plural(unlinked, "unlinked video")}`} in {plural(sessions, "session")}, with{" "}
            {plural(adapted.names.length, "name")}.
          </p>
        </div>
      )}

      <Footer>
        <Button type="button" size="lg" className="w-full" disabled={!ready} onClick={flow.next}>
          Continue
        </Button>
      </Footer>
    </>
  );
}

// ----------------------------------------------------------------- 2. people

const describe = (choice: Choice) =>
  choice.kind === "account" ? (choice.account.isGuest ? "Guest you made" : `@${choice.account.handle}`) : `New guest, @${choice.handle}`;

function PeopleStep({ flow, known }: { flow: Flow; known: Account[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const games = (name: string) => flow.adapted!.rows.filter((r) => [...(r.sides?.[0] ?? []), ...(r.sides?.[1] ?? [])].includes(name)).length;

  return (
    <>
      <div className="flex flex-col gap-1 px-1">
        <h2 className="section-title">Who is who?</h2>
        <p className="text-subhead text-muted-foreground">
          The file uses first names. Tap a name to link it to someone you know, or keep it as a guest. Each name is linked once for the whole file.
          If the file spells one person two ways, link both names to the same person.
        </p>
      </div>

      <ul className="group-list">
        {flow.names.map((name) => {
          const choice = flow.choices[name];
          const also = alsoCalled(name, flow.names, flow.choices);
          const person =
            choice.kind === "account"
              ? choice.account
              : { id: name, displayName: choice.displayName, avatarUrl: null };
          return (
            <li key={name}>
              <button type="button" onClick={() => setEditing(name)} className="pressable-row list-row min-h-16 w-full text-left">
                <PersonAvatar person={person} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold tracking-tight">{name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {describe(choice)}
                    {also.length > 0 && `, also ${also.join(" and ")}`}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">{plural(games(name), "game")}</span>
                <RowChevron />
              </button>
            </li>
          );
        })}
      </ul>

      <PersonSheet
        name={editing}
        current={editing ? flow.choices[editing] : undefined}
        people={known}
        fromFile={editing ? guestsFromFile(editing, flow.names, flow.choices) : []}
        onChoose={(choice) => {
          if (editing) flow.setChoice(editing, choice);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />

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

// ---------------------------------------------------------------- 3. preview

/** What an import adds, in words: "250 games and 14 unlinked videos". */
function whatIn({ games, unlinked }: ImportReport["created"]) {
  return [games > 0 || unlinked === 0 ? plural(games, "game") : null, unlinked > 0 ? plural(unlinked, "unlinked video") : null]
    .filter(Boolean)
    .join(" and ");
}

function Summary({ report }: { report: ImportReport }) {
  const { created } = report;
  const facts = [
    plural(created.games, "game"),
    plural(created.sessions, "new session"),
    created.guests ? plural(created.guests, "new guest") : null,
    plural(created.videos, "video"),
    created.unlinked ? `${created.unlinked} unlinked` : null,
  ].filter(Boolean);
  // The dot stays with the fact before it, so a wrapped line never starts with one.
  return (
    <p className="flex flex-wrap justify-center gap-x-1.5 px-1 text-subhead text-muted-foreground">
      {facts.map((fact, index) => (
        <span key={fact} className="whitespace-nowrap">
          {fact}
          {index < facts.length - 1 ? " ·" : ""}
        </span>
      ))}
    </p>
  );
}

function PreviewStep({ flow }: { flow: Flow }) {
  const { report, problems, pending } = flow;

  if (problems.length > 0) {
    return (
      <>
        <div className="flex flex-col gap-1 px-1">
          <h2 className="section-title">Cannot import yet</h2>
          <p className="text-subhead text-muted-foreground">Nothing was saved. Fix {plural(problems.length, "problem")} and check again.</p>
        </div>
        <ul role="alert" className="group-list">
          {problems.slice(0, 20).map((message, index) => (
            <li key={index} className="list-row items-start text-sm">
              {message}
            </li>
          ))}
        </ul>
        <Footer>
          <Button type="button" size="lg" className="w-full" onClick={flow.back}>
            {flow.names.length === 0 ? "Back" : "Back to people"}
          </Button>
          <Button type="button" variant="ghost" onClick={flow.restart}>
            Choose another file
          </Button>
        </Footer>
      </>
    );
  }

  if (!report) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-subhead text-muted-foreground" role="status">
        <Spinner /> Checking the import
      </p>
    );
  }

  const nothingNew = report.created.games === 0 && report.created.unlinked === 0;
  return (
    <>
      <div className="flex flex-col gap-1 px-1">
        <h2 className="section-title">{nothingNew ? "Nothing new to import" : "Ready to import"}</h2>
        <Summary report={report} />
      </div>

      {report.sessions.length > 0 && (
        <section aria-labelledby="sessions-heading" className="flex flex-col gap-2">
          <h2 id="sessions-heading" className="section-label">
            Sessions
          </h2>
          <ul className="group-list">
            {report.sessions.map((s) => (
              <li key={`${s.date}${s.label}`} className="list-row">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold tracking-tight">{s.label}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {dayShort(s.date)} · {s.existing ? "Adds to your existing session" : "New session"}
                  </span>
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {(s.games > 0 || s.videos === 0) && <span className="block">{plural(s.games, "game")}</span>}
                  {s.videos > 0 && <span className="block">{plural(s.videos, "unlinked video")}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.skipped.length > 0 && (
        <section aria-labelledby="skipped-heading" className="flex flex-col gap-2">
          <h2 id="skipped-heading" className="section-label">
            Left out
          </h2>
          <div className="group-list">
            <p className="list-row text-sm">
              {plural(report.skipped.length, "row")} skipped: {report.skipped[0].reason.toLowerCase()}. Lines{" "}
              {report.skipped
                .slice(0, 8)
                .map((s) => flow.adapted?.lines[s.row] ?? s.row + 2)
                .join(", ")}
              {report.skipped.length > 8 ? " and more" : ""}.
            </p>
          </div>
        </section>
      )}

      <Footer>
        <Button type="button" size="lg" className="w-full" disabled={nothingNew || pending} onClick={flow.confirm}>
          {pending && <Spinner />}
          {pending ? "Importing" : `Import ${whatIn(report.created)}`}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={flow.back}>
          Back
        </Button>
      </Footer>
    </>
  );
}

// ------------------------------------------------------------------- 4. done

function DoneStep({ report, onAnother }: { report: ImportReport; onAnother: () => void }) {
  return (
    <>
      <Empty className="bg-card shadow-card">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-accent text-primary">
            <Check />
          </EmptyMedia>
          <EmptyTitle>Imported {whatIn(report.created)}</EmptyTitle>
          <EmptyDescription>
            <Summary report={report} />
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <Footer>
        <LeaveLink href="/sessions" className={buttonVariants({ size: "lg" })}>
          View sessions
        </LeaveLink>
        <Button type="button" variant="ghost" onClick={onAnother}>
          Import another file
        </Button>
      </Footer>
    </>
  );
}
