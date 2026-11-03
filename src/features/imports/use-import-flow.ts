"use client";

import { useState, useTransition } from "react";
import type { Account, ImportReport } from "@/src/contract";
import { importGames } from "@/src/features/imports/actions";
import { adaptBurningMars, type Adapted } from "@/src/features/imports/burning-mars";
import { defaultChoices, describeProblems, importInput, type Choice } from "@/src/features/imports/import-input";
import { browserZone } from "@/src/lib/zoned";

export type ImportStep = "file" | "people" | "preview" | "done";

/** A file bigger than this is not a playlist list. It stops a wrong file from freezing the page. */
const MAX_FILE_BYTES = 1_000_000;

/**
 * The state of one import: the file, who each name is, the preview and the result. Nothing is saved
 * until `confirm`. The preview runs the real import and rolls it back, so what it shows is exact.
 */
export function useImportFlow(known: Account[]) {
  const [step, setStep] = useState<ImportStep>("file");
  const [adapted, setAdapted] = useState<Adapted | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [zone, setZone] = useState(() => browserZone());
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [report, setReport] = useState<ImportReport | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const names = adapted?.names ?? [];
  const send = (dryRun: boolean) => {
    if (!adapted) return Promise.resolve(null);
    return importGames(importInput(adapted.rows, adapted.names, choices, zone, dryRun));
  };

  async function chooseFile(file: File) {
    setFileError(null);
    setAdapted(null);
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) return void setFileError("That file is too big. A playlist list is a few kilobytes.");
    const read = adaptBurningMars(await file.text());
    setAdapted(read);
    if (!read.problems.length) setChoices(defaultChoices(read.names, known));
  }

  function preview() {
    setStep("preview");
    setReport(null);
    setProblems([]);
    start(async () => {
      const result = await send(true);
      if (!result || !adapted) return;
      if (result.ok) setReport(result.data);
      else setProblems(describeProblems(result.error, adapted.lines, adapted.names));
    });
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

  function confirm() {
    start(async () => {
      const result = await send(false);
      if (!result || !adapted) return;
      if (result.ok) {
        setReport(result.data);
        setStep("done");
      } else setProblems(describeProblems(result.error, adapted.lines, adapted.names));
    });
  }

  function restart() {
    setStep("file");
    setAdapted(null);
    setFileName("");
    setReport(null);
    setProblems([]);
  }

  return {
    step,
    setStep,
    adapted,
    names,
    fileName,
    fileError,
    zone,
    setZone,
    choices,
    setChoice: (name: string, choice: Choice) => setChoices((all) => ({ ...all, [name]: choice })),
    report,
    problems,
    pending,
    chooseFile,
    next,
    back,
    preview,
    confirm,
    restart,
  };
}
