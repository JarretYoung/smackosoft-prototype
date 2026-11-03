"use client";

import { CalendarDays, Check, FileText, FileUp, Globe, Trash2, TriangleAlert, Trophy, VideoOff } from "lucide-react";
import { useRef, useState } from "react";
import { RowChevron } from "@/src/components/row-chevron";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { Spinner } from "@/src/components/ui/spinner";
import type { Account } from "@/src/contract";
import { ImportStat } from "@/src/features/imports/import-stat";
import type { SetReport } from "@/src/features/imports/import-set";
import { BURNING_MARS_TEMPLATE } from "@/src/features/imports/burning-mars";
import { Footer } from "@/src/features/imports/footer";
import { PeopleStep } from "@/src/features/imports/people-step";
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
export function ImportFlow({ known, viewerId }: { known: Account[]; viewerId: string }) {
  const flow = useImportFlow(known, viewerId);
  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-32">
      {flow.step !== "done" && <Stepper flow={flow} />}
      {flow.step === "file" && <FileStep flow={flow} />}
      {flow.step === "people" && <PeopleStep flow={flow} known={known} viewerId={viewerId} />}
      {flow.step === "preview" && <PreviewStep flow={flow} />}
      {flow.step === "done" && flow.report && <DoneStep report={flow.report} onAnother={flow.restart} />}
    </div>
  );
}

type Flow = ReturnType<typeof useImportFlow>;

/** Where you are in the import. A step you have passed can be tapped to go back to it, and nothing you chose is lost. */
function Stepper({ flow }: { flow: Flow }) {
  const steps = [
    { id: "file", label: "File" },
    ...(flow.names.length > 0 ? [{ id: "people", label: "People" }] : []),
    { id: "preview", label: "Check" },
  ] as const;
  const current = steps.findIndex((step) => step.id === flow.step);
  return (
    <nav aria-label="Import steps" className="-mb-2 px-1">
      <ol className="flex items-center gap-2 text-footnote font-medium tracking-wide uppercase">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="h-px w-4 bg-border" />}
            {index < current ? (
              <button
                type="button"
                className="flex min-h-9 items-center gap-1.5 text-primary"
                onClick={() => (step.id === "file" ? flow.setStep("file") : flow.back())}
              >
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
                {step.label}
              </button>
            ) : (
              <span aria-current={index === current ? "step" : undefined} className={index === current ? "text-foreground" : "text-muted-foreground"}>
                {index + 1} {step.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ------------------------------------------------------------------- 1. file

const unit = (count: number, one: string) => (count === 1 ? one : `${one}s`);

function FileStep({ flow }: { flow: Flow }) {
  const input = useRef<HTMLInputElement>(null);
  const [zoneOpen, setZoneOpen] = useState(false);
  const { files, set } = flow;
  const many = files.length > 1;
  const problems = set.problems;
  const ready = files.length > 0 && problems.length === 0;

  return (
    <>
      <p className="px-1 text-subhead text-muted-foreground">
        Bring in a list of games and their videos from a file. Each row is a game, or a video not yet tied to a game. Nothing is saved until
        you confirm.
      </p>

      {flow.saved && files.length === 0 && (
        <section aria-labelledby="saved-heading" className="flex flex-col gap-2">
          <h2 id="saved-heading" className="section-label">
            Pick up where you left off
          </h2>
          <div className="group-list">
            <button type="button" onClick={flow.resume} className="pressable-row list-row w-full text-left">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <FileText aria-hidden className="size-4" strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{flow.saved.files.map((file) => file.name).join(", ")}</span>
                <span className="block text-sm text-muted-foreground">
                  {plural(flow.saved.files.length, "file")}, {flow.saved.step === "people" ? "names in progress" : "not started"}
                </span>
              </span>
              <RowChevron />
            </button>
          </div>
          <button type="button" onClick={flow.discardSaved} className={buttonVariants({ variant: "text", size: "sm", className: "self-start" })}>
            Start over
          </button>
        </section>
      )}

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
            Your files
          </h2>
          <a href={TEMPLATE_HREF} download="games-template.csv" className={buttonVariants({ variant: "text", size: "sm" })}>
            Download template
          </a>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Choose CSV files"
          onChange={(event) => {
            const list = [...(event.target.files ?? [])];
            if (list.length) void flow.chooseFiles(list);
            event.target.value = "";
          }}
        />
        {files.length === 0 && (
          <div className="group-list">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 text-left font-semibold text-primary"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <FileUp className="size-4" strokeWidth={2.5} />
              </span>
              Choose CSV files
            </button>
          </div>
        )}
        {flow.fileError && (
          <p role="alert" className="px-1 text-sm font-medium text-destructive">
            {flow.fileError}
          </p>
        )}
        {files.length > 0 && (
          <ul className="group-list">
            {files.map((file, index) => {
              const own = problems.filter((p) => p.file === file.name).length;
              return (
                <li key={`${index}-${file.name}`} className="list-row">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <FileText aria-hidden className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{file.name}</span>
                    <span className={own > 0 ? "block text-sm font-semibold text-destructive" : "block text-sm text-muted-foreground"}>
                      {own > 0 ? plural(own, "problem") : plural(file.adapted.rows.length, "row")}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => flow.removeFile(index)}
                    className="-mr-3 flex size-11 shrink-0 items-center justify-center text-muted-foreground"
                  >
                    <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={buttonVariants({ variant: "text", size: "sm", className: "self-start" })}
          >
            Add another file
          </button>
        )}
      </section>

      {problems.length > 0 && (
        <ProblemList
          title={plural(problems.length, "problem")}
          total={problems.length}
          items={problems.map((p) => ({ line: p.line, message: p.message, file: many ? p.file : undefined }))}
        />
      )}

      {ready && (
        <section aria-labelledby="holds-heading" className="flex flex-col gap-2" aria-live="polite">
          <h2 id="holds-heading" className="section-label">
            In this import
          </h2>
          <ul className="group-list">
            <ImportStat icon={Trophy} value={set.counts.games} label={`${unit(set.counts.games, "Game")} with a video`} />
            <ImportStat icon={CalendarDays} value={set.counts.sessions} label={unit(set.counts.sessions, "Session")} />
            <ImportStat icon={VideoOff} value={set.counts.unlinked} label={`Unlinked ${unit(set.counts.unlinked, "video")}`} />
          </ul>
        </section>
      )}

      <Footer>
        <Button type="button" size="lg" className="w-full" disabled={!ready} onClick={flow.next}>
          Continue
        </Button>
      </Footer>
    </>
  );
}

// ---------------------------------------------------------------- 3. preview

/** What an import adds, in words: "250 games and 14 unlinked videos". */
function whatIn({ games, unlinked }: SetReport["created"]) {
  return [games > 0 || unlinked === 0 ? plural(games, "game") : null, unlinked > 0 ? plural(unlinked, "unlinked video") : null]
    .filter(Boolean)
    .join(" and ");
}

function Summary({ report }: { report: Pick<SetReport, "created"> }) {
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

const SHOWN_PROBLEMS = 20;

/** What is wrong, as one list for both the file step and the check: the line in red, then the file and the words. */
function ProblemList({ title, total, items }: { title: string; total: number; items: { line: number | null; message: string; file?: string }[] }) {
  return (
    <section aria-labelledby="problems-heading" className="flex flex-col gap-2">
      <h2 id="problems-heading" className="section-label">
        {title} to fix
      </h2>
      <ul role="alert" className="group-list">
        {items.slice(0, SHOWN_PROBLEMS).map((item, index) => (
          <li key={index} className="list-row items-start">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert aria-hidden className="size-4" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1">
              {(item.line !== null || item.file) && (
                <span className="block text-sm font-semibold text-destructive">
                  {[item.file, item.line !== null ? `Line ${item.line}` : null].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="block text-body">{item.message}</span>
            </span>
          </li>
        ))}
      </ul>
      {total > SHOWN_PROBLEMS && <p className="px-1 text-sm text-muted-foreground">And {total - SHOWN_PROBLEMS} more. Fix these first.</p>}
    </section>
  );
}

function PreviewStep({ flow }: { flow: Flow }) {
  const { report, problems, pending, partial, progress } = flow;
  const many = flow.files.length > 1;

  if (problems.length > 0) {
    return (
      <>
        <div className="flex flex-col gap-1 px-1">
          <h2 className="section-title">{partial ? `Stopped at ${partial.file}` : "Cannot import yet"}</h2>
          <p className="text-subhead text-muted-foreground">
            {partial
              ? `${partial.done} of ${partial.of} files are imported. Nothing from ${partial.file} was saved. Fix ${plural(problems.length, "problem")}, then choose the files again: what is already in is left out.`
              : `Nothing was saved. Fix ${plural(problems.length, "problem")} and check again.`}
          </p>
        </div>
        <ProblemList
          title={plural(problems.length, "problem")}
          total={problems.length}
          items={problems.map((message) => {
            const found = /^Line (\d+): ([\s\S]*)$/.exec(message);
            return found ? { line: Number(found[1]), message: found[2] } : { line: null, message };
          })}
        />
        <Footer>
          {partial ? (
            <Button type="button" size="lg" className="w-full" onClick={flow.restart}>
              Choose the files again
            </Button>
          ) : (
            <>
              <Button type="button" size="lg" className="w-full" onClick={flow.back}>
                {flow.names.length === 0 ? "Back" : "Back to people"}
              </Button>
              <Button type="button" variant="ghost" onClick={flow.restart}>
                Choose other files
              </Button>
            </>
          )}
        </Footer>
      </>
    );
  }

  if (!report) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-subhead text-muted-foreground" role="status">
        <Spinner /> Checking the import{progress && progress.of > 1 ? `, file ${progress.at} of ${progress.of}` : ""}
      </p>
    );
  }

  const nothingNew = report.created.games === 0 && report.created.unlinked === 0;
  return (
    <>
      <div className="flex flex-col gap-1 px-1">
        <h2 className="section-title">{nothingNew ? "Nothing new to import" : "Ready to import"}</h2>
        <Summary report={report} />
        {many && <p className="text-center text-sm text-muted-foreground">Each file was checked on its own. The real import is exact.</p>}
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
              {plural(report.skipped.length, "row")} skipped: {report.skipped[0].reason.toLowerCase()}. {many ? "" : "Lines "}
              {report.skipped
                .slice(0, 8)
                .map((s) => (many ? `${s.file} line ${s.line}` : s.line))
                .join(", ")}
              {report.skipped.length > 8 ? " and more" : ""}.
            </p>
          </div>
        </section>
      )}

      <Footer>
        <Button type="button" size="lg" className="w-full" disabled={nothingNew || pending} onClick={flow.confirm}>
          {pending && <Spinner />}
          {pending ? `Importing${progress && progress.of > 1 ? `, file ${progress.at} of ${progress.of}` : ""}` : `Import ${whatIn(report.created)}`}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={flow.back}>
          Back
        </Button>
      </Footer>
    </>
  );
}

// ------------------------------------------------------------------- 4. done

function DoneStep({ report, onAnother }: { report: SetReport; onAnother: () => void }) {
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
