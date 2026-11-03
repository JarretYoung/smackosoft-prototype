"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import type { Account, AppError, ImportReport, Result } from "@/src/contract";
import { importGames } from "@/src/features/imports/actions";
import { adaptBurningMars } from "@/src/features/imports/burning-mars";
import { applyNewGuests, defaultChoices, describeProblems, importInput, type Choice } from "@/src/features/imports/import-input";
import { clearDraft, draftText, parseDraft, saveDraft } from "@/src/features/imports/import-draft";
import { combineFiles, mergeReports, type LoadedFile, type SetReport } from "@/src/features/imports/import-set";
import { browserZone } from "@/src/lib/zoned";

export type ImportStep = "file" | "people" | "preview" | "done";

/** A file bigger than this is not a playlist list. It stops a wrong file from freezing the page. */
const MAX_FILE_BYTES = 1_000_000;

/**
 * The state of one import: the files, who each name is, the preview and the result. Nothing is saved until `confirm`.
 * The preview runs the real import and rolls it back, so what it shows is exact. Several files are one set: each name
 * is linked once, and the files go one after another, each in its own transaction, in file order.
 */
export function useImportFlow(known: Account[], viewerId: string) {
  const [step, setStep] = useState<ImportStep>("file");
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [zone, setZone] = useState(() => browserZone());
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  /** The names the people step has asked about. Coming back, it opens the review, or asks only about names not yet asked. */
  const [asked, setAsked] = useState<string[]>([]);
  /** True once the unfinished import has been picked up or dropped, so it is no longer offered. */
  const [dropped, setDropped] = useState(false);
  const [report, setReport] = useState<SetReport | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  /** Set when a later file stopped the run after earlier ones were imported. */
  const [partial, setPartial] = useState<{ done: number; of: number; file: string } | null>(null);
  /** Which file is being sent, while it is. */
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  const [pending, start] = useTransition();

  const set = useMemo(() => combineFiles(files), [files]);
  const names = set.names;

  const send = (index: number, picks: Record<string, Choice>, dryRun: boolean): Promise<Result<ImportReport>> =>
    importGames(importInput(files[index].adapted.rows, names, picks, zone, dryRun));

  /** A problem the backend found, in words about the file, with the file's name when there is more than one. */
  const words = (index: number, error: AppError) =>
    describeProblems(error, files[index].adapted.lines, names).map((message) => (files.length > 1 ? `${files[index].name}: ${message}` : message));

  const read = (name: string, text: string): LoadedFile => ({ name, text, adapted: adaptBurningMars(text) });

  // The unfinished import is read when the page reaches the browser, so the server and the first paint agree.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const stored = useSyncExternalStore(noopSubscribe, () => draftText(viewerId), () => null);
  const found = useMemo(() => parseDraft(stored), [stored]);
  const saved = dropped ? null : found;
  const checked = hydrated;

  // Keep the import as it goes, so leaving the page loses nothing. Dropping every file is a reset.
  useEffect(() => {
    if (!checked || step === "done") return;
    if (files.length > 0) {
      saveDraft(viewerId, {
        files: files.map(({ name, text }) => ({ name, text })),
        choices,
        asked,
        zone,
        step: step === "file" || names.length === 0 ? "file" : "people",
      });
    } else if (!saved) clearDraft(viewerId);
  }, [checked, viewerId, step, files, choices, asked, zone, names.length, saved]);

  /** Pick up the unfinished import. */
  function resume() {
    if (!saved) return;
    const loaded = saved.files.map((file) => read(file.name, file.text));
    setFiles(loaded);
    setZone(saved.zone);
    setChoices(saved.choices);
    setAsked(saved.asked);
    setStep(saved.step === "people" && combineFiles(loaded).problems.length === 0 ? "people" : "file");
    setDropped(true);
  }

  function discardSaved() {
    clearDraft(viewerId);
    setDropped(true);
  }

  /** Change the files. The names that are still there keep who they were set to, new names start from a guess, and the rest are dropped. */
  function load(loaded: LoadedFile[]) {
    setFiles(loaded);
    setDropped(true);
    const combined = combineFiles(loaded);
    if (loaded.length === 0) {
      setChoices({});
      setAsked([]);
    } else if (!combined.problems.length) {
      setChoices(defaultChoices(combined.names, known, choices));
      setAsked((all) => all.filter((name) => combined.names.includes(name)));
    }
  }

  async function chooseFiles(list: File[]) {
    setFileError(null);
    const big = list.find((file) => file.size > MAX_FILE_BYTES);
    if (big) return void setFileError(`${big.name} is too big. A playlist list is a few kilobytes.`);
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const added = await Promise.all(sorted.map(async (file) => read(file.name, await file.text())));
    load([...files, ...added]);
  }

  function removeFile(index: number) {
    load(files.filter((_, at) => at !== index));
  }

  /** The people step has nothing to ask when the file names nobody (only unlinked videos), so go straight to the check. */
  function next() {
    if (names.length === 0) preview();
    else setStep("people");
  }

  /** Back from the check to the step before it. */
  function back() {
    setStep(names.length === 0 ? "file" : "people");
  }

  function preview() {
    setStep("preview");
    setReport(null);
    setProblems([]);
    setPartial(null);
    start(async () => {
      const reports: Parameters<typeof mergeReports>[0] = [];
      for (let index = 0; index < files.length; index++) {
        setProgress({ at: index + 1, of: files.length });
        const result = await send(index, choices, true);
        if (!result.ok) {
          setProgress(null);
          return void setProblems(words(index, result.error));
        }
        reports.push({ file: files[index].name, lines: files[index].adapted.lines, report: result.data });
      }
      setProgress(null);
      setReport(mergeReports(reports));
    });
  }

  function confirm() {
    start(async () => {
      let picks = choices;
      const reports: Parameters<typeof mergeReports>[0] = [];
      for (let index = 0; index < files.length; index++) {
        setProgress({ at: index + 1, of: files.length });
        const result = await send(index, picks, false);
        if (!result.ok) {
          setProgress(null);
          setChoices(picks);
          setPartial(index > 0 ? { done: index, of: files.length, file: files[index].name } : null);
          return void setProblems(words(index, result.error));
        }
        // The next file links to the guests this one made, so none is made twice.
        picks = applyNewGuests(picks, result.data.newGuests);
        reports.push({ file: files[index].name, lines: files[index].adapted.lines, report: result.data });
      }
      setChoices(picks);
      setProgress(null);
      setReport(mergeReports(reports));
      setStep("done");
      clearDraft(viewerId);
    });
  }

  function restart() {
    setStep("file");
    load([]);
    setReport(null);
    setProblems([]);
    setPartial(null);
    setProgress(null);
  }

  return {
    step,
    setStep,
    files,
    set,
    names,
    fileError,
    zone,
    setZone,
    choices,
    asked,
    markAsked: (name: string) => setAsked((all) => (all.includes(name) ? all : [...all, name])),
    saved,
    resume,
    discardSaved,
    setChoice: (name: string, choice: Choice) => setChoices((all) => ({ ...all, [name]: choice })),
    report,
    problems,
    partial,
    progress,
    pending,
    chooseFiles,
    removeFile,
    next,
    back,
    preview,
    confirm,
    restart,
  };
}

const noopSubscribe = () => () => {};
