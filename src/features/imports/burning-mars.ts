/**
 * The adapter for the BurningMars playlist. It turns a CSV file into the rows the import takes, and knows
 * how this playlist writes titles: "24 Oct SoongJit vs NadIan", each name starting with a capital letter.
 * The backend never sees any of this. Another playlist style is another adapter next to this one.
 */
import Papa from "papaparse";
import { DateOnly, HttpUrl, type ImportRow } from "../../contract";
import { checkImportRows } from "../../lib/import-rules";

/** A problem in the file, at a line a person can find in their spreadsheet (the header is line 1). */
export type FileProblem = { line: number; field: string; message: string };

export type Adapted = {
  rows: ImportRow[];
  /** The line of each row in the file. */
  lines: number[];
  /** Every distinct name, in the order they first appear. */
  names: string[];
  /** Empty when the file is fine. With problems, nothing is imported. */
  problems: FileProblem[];
};

/**
 * `match` names a match inside its session, and a game in a match says which game it is in `game`, or at the end of
 * the title ("Game 2" or just "2"). A row with no `match` is a game on its own and has no game number.
 * `kind` is optional. Blank or "game" is a game, and the title must name the players. "video" is a video with
 * no game: the title is only its name, and it waits in the session for the person to link it.
 * `comments` is for people, such as what a script was unsure of. It is a known column and is never read.
 */
export const BURNING_MARS_COLUMNS = ["date", "session", "match", "game", "title", "url", "kind", "comments"] as const;
const REQUIRED = ["date", "title", "url"] as const;

/** What the person downloads and fills in. */
export const BURNING_MARS_TEMPLATE = [
  BURNING_MARS_COLUMNS.join(","),
  "2026-10-24,,1,1,24 Oct SoongJit vs NadIan,https://youtu.be/AAAAAAAAAAA,,",
  "2026-10-24,,1,2,24 Oct SoongJit vs NadIan Game 2,https://youtu.be/BBBBBBBBBBB,,",
  "2026-10-24,,,,24 Oct JusJit vs IanFar,https://youtu.be/CCCCCCCCCCC,,",
  "2026-10-24,,,,24 Oct JusJit vs IanFar [Ians view],https://youtu.be/DDDDDDDDDDD,video,Another angle of the last game",
  "",
].join("\n");

/** "24 Oct " may come first. The two sides are either side of "vs". */
const TITLE = /^(?:\d{1,2}\s+[A-Za-z]+\s+)?(.+?)\s+vs\s+(.+?)\s*$/i;

/** "Game 2", "(Game 2)" or "2" at the end of a title. Names are letters only, so a number there is a game number. */
const GAME_SUFFIX = /\s+(?:\((?:game\s*)?(\d+)\)|(?:game\s*)?(\d+))\s*$/i;

/** Takes the game number off the end of a title. */
function splitGameNumber(title: string): { title: string; game?: number } {
  const found = GAME_SUFFIX.exec(title);
  return found ? { title: title.slice(0, found.index), game: Number(found[1] ?? found[2]) } : { title };
}

/** SoongJit becomes Soong and Jit. Null when the block is not names written with capital letters. */
export function namesIn(block: string): string[] | null {
  if (!/^[A-Za-z]+$/.test(block)) return null;
  const names = block.match(/[A-Z][a-z]*/g) ?? [];
  return names.length && names.join("") === block ? names : null;
}

const isDate = (value: string) => DateOnly.safeParse(value).success;
const isUrl = (value: string) => HttpUrl.safeParse(value).success;

/** Reads the file. Each row is checked on its own, so every problem is listed in one pass. */
export function adaptBurningMars(text: string): Adapted {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: false });
  const table = parsed.data;
  const problems: FileProblem[] = [];
  const out: Adapted = { rows: [], lines: [], names: [], problems };

  const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length) {
    problems.push({ line: 1, field: missing[0], message: `The file needs a ${missing.join(", ")} column. Download the template to see them.` });
    return out;
  }
  // A misspelt column would be ignored and its values lost, so name it.
  header.forEach((name, index) => {
    if (name === "") return;
    if (!(BURNING_MARS_COLUMNS as readonly string[]).includes(name)) {
      problems.push({ line: 1, field: name, message: `Unknown column "${name}". The columns are ${BURNING_MARS_COLUMNS.join(", ")}.` });
    } else if (header.indexOf(name) !== index) {
      problems.push({ line: 1, field: name, message: `The column "${name}" appears twice.` });
    }
  });
  if (problems.length) return out;
  const at = (cells: string[], column: string) => (cells[header.indexOf(column)] ?? "").trim();

  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === "")) return;
    const before = problems.length;
    const problem = (field: string, message: string) => problems.push({ line, field, message });

    const date = at(cells, "date");
    const title = at(cells, "title");
    const url = at(cells, "url");
    if (!isDate(date)) problem("date", "Write the date as YYYY-MM-DD, for example 2026-10-24");
    if (!isUrl(url)) problem("url", "Needs a link starting with https://");

    const kind = at(cells, "kind").toLowerCase();
    if (kind !== "" && kind !== "game" && kind !== "video") {
      problem("kind", 'Leave this blank for a game, or write "video" for a video with no game');
      return;
    }
    if (kind === "video") {
      if (!title) problem("title", "A video needs a name");
      if (at(cells, "match")) problem("match", "A video with no game has no match number");
      if (at(cells, "game")) problem("game", "A video with no game has no game number");
      if (!isDate(date) || !isUrl(url) || !title || at(cells, "match") || at(cells, "game")) return;
      out.rows.push({ date, label: title, videoUrl: url, ...(at(cells, "session") && { session: at(cells, "session") }) });
      out.lines.push(line);
      return;
    }

    // The game number comes from the column, or from the end of the title. When both are there they must agree.
    const match = at(cells, "match");
    const column = at(cells, "game");
    let given: number | undefined;
    if (column !== "") {
      if (/^\d+$/.test(column) && Number(column) >= 1) given = Number(column);
      else problem("game", "Write the game number as a whole number from 1, for example 2");
    }
    const { title: bare, game: inTitle } = splitGameNumber(title);
    if (given !== undefined && inTitle !== undefined && given !== inTitle) {
      problem("game", `The title says game ${inTitle} and the game column says ${given}`);
    }
    const game = given ?? inTitle;
    if (match && game === undefined && column === "") problem("game", `Match ${match} needs a game number. Write it in the game column, or end the title with "Game 2"`);
    if (!match && game !== undefined) problem("match", `Game ${game} needs a match name or number. A game on its own has no game number`);

    const found = TITLE.exec(bare);
    const sides = found ? [namesIn(found[1]), namesIn(found[2])] : null;
    if (!sides || !sides[0] || !sides[1]) {
      problem("title", `Cannot read the players. Write it like "24 Oct SoongJit vs NadIan", each name starting with a capital letter`);
    }
    if (problems.length > before || !sides || !sides[0] || !sides[1]) return;

    const row: ImportRow = {
      date,
      label: title,
      videoUrl: url,
      sides: [sides[0], sides[1]],
      ...(at(cells, "session") && { session: at(cells, "session") }),
      ...(match && game !== undefined && { match, game }),
    };
    out.rows.push(row);
    out.lines.push(line);
    for (const name of [...sides[0], ...sides[1]]) {
      if (!seen.has(name)) {
        seen.add(name);
        out.names.push(name);
      }
    }
  });

  // The rules about rows together, the same ones the backend runs, said in lines of this file.
  for (const issue of checkImportRows(out.rows, (index) => `line ${out.lines[index]}`)) {
    const index = issue.path[1] as number;
    problems.push({ line: out.lines[index], field: String(issue.path[2]), message: issue.message });
  }
  problems.sort((a, b) => a.line - b.line);

  if (!problems.length && !out.rows.length) problems.push({ line: 2, field: "date", message: "The file has no rows" });
  return out;
}
