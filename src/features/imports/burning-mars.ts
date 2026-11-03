/**
 * The adapter for the BurningMars playlist. It turns a CSV file into the rows the import takes, and knows
 * how this playlist writes titles: "24 Oct SoongJit vs NadIan", each name starting with a capital letter.
 * The backend never sees any of this. Another playlist style is another adapter next to this one.
 */
import Papa from "papaparse";
import { DateOnly, HttpUrl, type ImportRow } from "../../contract";

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

export const BURNING_MARS_COLUMNS = ["date", "session", "match", "title", "url"] as const;
const REQUIRED = ["date", "title", "url"] as const;

/** What the person downloads and fills in. */
export const BURNING_MARS_TEMPLATE = [
  BURNING_MARS_COLUMNS.join(","),
  "2026-10-24,,1,24 Oct SoongJit vs NadIan,https://youtu.be/AAAAAAAAAAA",
  "2026-10-24,,1,24 Oct SoongJit vs NadIan,https://youtu.be/BBBBBBBBBBB",
  "2026-10-24,,,24 Oct JusJit vs IanFar,https://youtu.be/CCCCCCCCCCC",
  "",
].join("\n");

/** "24 Oct " may come first. The two sides are either side of "vs". */
const TITLE = /^(?:\d{1,2}\s+[A-Za-z]+\s+)?(.+?)\s+vs\s+(.+?)\s*$/i;

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
  const at = (cells: string[], column: string) => (cells[header.indexOf(column)] ?? "").trim();

  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === "")) return;
    const problem = (field: string, message: string) => problems.push({ line, field, message });

    const date = at(cells, "date");
    const title = at(cells, "title");
    const url = at(cells, "url");
    if (!isDate(date)) problem("date", "Write the date as YYYY-MM-DD, for example 2026-10-24");
    if (!isUrl(url)) problem("url", "Needs a link starting with https://");
    const found = TITLE.exec(title);
    const sides = found ? [namesIn(found[1]), namesIn(found[2])] : null;
    if (!sides || !sides[0] || !sides[1]) {
      problem("title", `Cannot read the players. Write it like "24 Oct SoongJit vs NadIan", each name starting with a capital letter`);
    }
    if (!isDate(date) || !isUrl(url) || !sides || !sides[0] || !sides[1]) return;

    const row: ImportRow = {
      date,
      label: title,
      videoUrl: url,
      sides: [sides[0], sides[1]],
      ...(at(cells, "session") && { session: at(cells, "session") }),
      ...(at(cells, "match") && { match: at(cells, "match") }),
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

  if (!problems.length && !out.rows.length) problems.push({ line: 2, field: "date", message: "The file has no rows" });
  return out;
}
