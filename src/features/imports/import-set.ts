/**
 * Several import files taken as one set. A first load over 300 rows comes as several files, and the person
 * links each name once for all of them. The set holds what the screens need and the problems of the whole set,
 * said in the file and line a person can find.
 */
import { IMPORT_MAX_ROWS, type ImportReport, type ImportRow } from "../../contract";
import { checkImportRows, sessionLabelOf } from "../../lib/import-rules";
import type { Adapted, FileProblem } from "./burning-mars";

/** A chosen file: its name, its text (kept so the import can be picked up again later), and what was read from it. */
export type LoadedFile = { name: string; text: string; adapted: Adapted };

export type SetProblem = FileProblem & { file: string };

export type ImportSet = {
  files: LoadedFile[];
  /** Every row of every file, in file order. */
  rows: ImportRow[];
  /** Where each row came from: the index of its file and its line. */
  origin: { file: number; line: number }[];
  /** Every distinct name, in the order they first appear. */
  names: string[];
  /** Empty when the set is fine. */
  problems: SetProblem[];
  counts: { games: number; unlinked: number; sessions: number };
};

export function combineFiles(files: LoadedFile[]): ImportSet {
  const rows: ImportRow[] = [];
  const origin: ImportSet["origin"] = [];
  const names: string[] = [];
  const problems: SetProblem[] = [];
  const many = files.length > 1;

  files.forEach(({ name, adapted }, file) => {
    adapted.rows.forEach((row, index) => {
      rows.push(row);
      origin.push({ file, line: adapted.lines[index] });
    });
    for (const person of adapted.names) if (!names.includes(person)) names.push(person);
    for (const problem of adapted.problems) problems.push({ ...problem, file: name });
    // One import call takes at most 300 rows, so a bigger file has to be cut. Say so now and not at the check.
    if (adapted.rows.length > IMPORT_MAX_ROWS) {
      problems.push({
        file: name,
        line: 1,
        field: "rows",
        message: `This file has ${adapted.rows.length} rows. The import takes ${IMPORT_MAX_ROWS} at a time, so split it between days.`,
      });
    }
  });

  // The rules about rows together, over every file, so a video or a game number used in two files is found too.
  const where = (index: number) => `${many ? `${files[origin[index].file].name} ` : ""}line ${origin[index].line}`;
  const issues = checkImportRows(rows, where);
  // A row that repeats a video usually repeats its game too. One line about it is enough.
  const repeated = new Set(issues.filter((issue) => issue.path[2] === "videoUrl").map((issue) => issue.path[1]));
  for (const issue of issues) {
    if (issue.path[2] === "game" && repeated.has(issue.path[1])) continue;
    const at = origin[issue.path[1] as number];
    problems.push({ file: files[at.file].name, line: at.line, field: String(issue.path[2]), message: issue.message });
  }
  const order = (problem: SetProblem) => files.findIndex((f) => f.name === problem.file);
  problems.sort((a, b) => order(a) - order(b) || a.line - b.line);

  const games = rows.filter((row) => row.sides).length;
  const sessions = new Set(rows.map((row) => `${row.date}\u0000${sessionLabelOf(row)}`)).size;
  return { files, rows, origin, names, problems, counts: { games, unlinked: rows.length - games, sessions } };
}

/** What a whole set did, put together from what each file did. */
export type SetReport = {
  created: ImportReport["created"];
  sessions: ImportReport["sessions"];
  /** Rows left out, by file and line. */
  skipped: { file: string; line: number; reason: string }[];
};

export function mergeReports(reports: { file: string; lines: number[]; report: ImportReport }[]): SetReport {
  const created = { sessions: 0, matches: 0, games: 0, videos: 0, unlinked: 0, guests: 0 };
  const merged: SetReport = { created, sessions: [], skipped: [] };
  // A guest used in two files is made once, by the first, so it is counted once.
  const guests = new Set<string>();
  for (const { file, lines, report } of reports) {
    for (const key of Object.keys(created) as (keyof typeof created)[]) created[key] += report.created[key];
    for (const guest of report.newGuests) guests.add(guest.handle);
    merged.sessions.push(...report.sessions);
    merged.skipped.push(...report.skipped.map((s) => ({ file, line: lines[s.row] ?? s.row + 2, reason: s.reason })));
  }
  created.guests = guests.size;
  return merged;
}
