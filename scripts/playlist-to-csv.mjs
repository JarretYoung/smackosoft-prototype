#!/usr/bin/env node
/**
 * Turns one or more YouTube playlists into a BurningMars import CSV (date,session,match,game,title,url,kind,comments).
 *
 * Usage:
 *   node scripts/playlist-to-csv.mjs <playlist url or id>... [--out playlists.csv] [--names scripts/playlist-names.json]
 *
 * Needs YOUTUBE_API_KEY in the environment or in .env.local (the same key the app uses).
 * Uses only the YouTube Data API and Node 18+. No packages.
 *
 * It is a pure function of the playlists and the names file. It reads no CSV and keeps no state. Ties break by
 * upload time, then video id, so a newer upload does not move an older video. The one exception: a game with no number
 * is numbered by guess, and a later video titled with that number moves it. The import then refuses it, loudly.
 *
 * How it decides (the rules, in order):
 *  1. Date. The day and month come from the title ("24 Oct", "Jan 12", "(21st April)"). The year is the
 *     latest year where that day falls on or before the upload date.
 *  2. Names. Every name goes through playlist-names.json, so Nadree, Nard and NAD all become Nad.
 *     A team is a set of players: GarNad and NadGar are the same team.
 *  3. Session. One calendar day is one session. The session column stays blank.
 *  4. Match. On one day, the same two teams (either side first) play a match, always named, even with one game:
 *     "GarNad v IanJus", and "GarNad v IanJus 2" for a second series. A number that repeats ("1, 2, 1, 2")
 *     starts the next series.
 *  5. Game. The number in the title ("2", "Game 4"). A game with no number takes the lowest free number in its
 *     match, by upload order. "Game 4.1", "Game 4.2" and "Game 4 1" are parts of one game: part 1 is the game's
 *     video and the later parts are videos with no game.
 *  6. A title that is not "A vs B" (a practice, a point of view, a [bracketed note]) becomes a video with no
 *     game (kind "video"). It goes on the day in its title, else its upload day. Link it to a game in the app.
 *  7. A first load over 300 rows is split into several files at day boundaries, because the import takes 300.
 *  8. Anything uncertain goes in the row's comments column, for a person to read and clear. Nothing stops the run and
 *     nothing is dropped. A row with no day is written with a blank date, so the import stops at it until one is written.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The most rows one import takes (IMPORT_MAX_ROWS in src/contract/imports.ts). */
const IMPORT_MAX_ROWS = 300;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const FULL = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthIndex = (word) => {
  const w = word.toLowerCase();
  const i = FULL.indexOf(w);
  if (i >= 0) return i;
  return w === "sept" ? 8 : MONTHS.indexOf(w);
};

/** The same rule as the app: SoongJus is Soong and Jus. Names are letters, each starting with a capital. */
function namesIn(block) {
  if (!/^[A-Za-z]+$/.test(block)) return null;
  const names = block.match(/[A-Z][a-z]*/g) ?? [];
  return names.length && names.join("") === block ? names : null;
}

/** Reads playlist-names.json into lookups. */
export function loadNames(file = join(HERE, "playlist-names.json")) {
  const json = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { names: {}, ignore: [] };
  const canonical = new Map();
  for (const [name, variants] of Object.entries(json.names ?? {})) {
    canonical.set(name.toLowerCase(), name);
    for (const variant of variants) canonical.set(variant.toLowerCase(), name);
  }
  return { canonical, ignore: new Set((json.ignore ?? []).map((w) => w.toLowerCase())) };
}

/** Cuts a word into the fewest known names, so "IaN" is Ian and "NadJus" is Nad and Jus. Null when it cannot. */
function segment(word, canonical) {
  const lower = word.toLowerCase();
  const memo = new Map();
  const best = (from) => {
    if (from === lower.length) return [];
    if (memo.has(from)) return memo.get(from);
    let result = null;
    for (let end = lower.length; end > from; end--) {
      const name = canonical.get(lower.slice(from, end));
      if (!name) continue;
      const tail = best(end);
      if (tail && (!result || tail.length + 1 < result.length)) result = [name, ...tail];
    }
    memo.set(from, result);
    return result;
  };
  return best(0);
}

/** One side of a title into canonical players, sorted. Returns { players, unknown } or { error }. */
function readSide(side, names) {
  const players = [];
  const unknown = [];
  for (const word of side.split(/[\s-]+/).filter(Boolean)) {
    if (names.ignore.has(word.toLowerCase())) continue;
    const capitals = namesIn(word);
    if (capitals && capitals.every((n) => names.canonical.has(n.toLowerCase()))) {
      players.push(...capitals.map((n) => names.canonical.get(n.toLowerCase())));
      continue;
    }
    const cut = /^[A-Za-z]+$/.test(word) ? segment(word, names.canonical) : null;
    if (cut) {
      players.push(...cut);
      continue;
    }
    if (!capitals) return { error: `cannot read the names in "${side}" (letters only)` };
    for (const n of capitals) {
      if (n.length === 1) return { error: `"${side}" has a one-letter name, check the capitals` };
      const known = names.canonical.get(n.toLowerCase());
      if (!known) unknown.push(n);
      players.push(known ?? n);
    }
  }
  const unique = [...new Set(players)].sort();
  return unique.length ? { players: unique, unknown } : { error: `no names in "${side}"` };
}

/**
 * Reads the day and month at the start of a title, and gives back the rest. Returns { day, month, rest } or { error }.
 * "(21st April) ..." and "(June 1st) ..." are dates in brackets. Any other leading bracket, like "(Local Archives)", is dropped.
 */
export function readDate(raw) {
  let t = raw.trim().replace(/\s+/g, " ");
  const lead = t.match(/^\(([^)]*)\)\s*(.*)$/);
  if (lead) t = /^(\d{1,2}\w* [A-Za-z]+|[A-Za-z]+ \d{1,2}\w*)$/.test(lead[1].trim()) ? `${lead[1].trim()} ${lead[2]}` : lead[2];
  t = t.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/i, "$1");

  let found = t.match(/^(\d{1,2}) ([A-Za-z]+) (.+)$/);
  if (found && monthIndex(found[2]) >= 0) return { day: Number(found[1]), month: monthIndex(found[2]), rest: found[3] };
  found = t.match(/^([A-Za-z]+) (\d{1,2}) (.+)$/);
  if (!found || monthIndex(found[1]) < 0) return { error: "no day and month at the start" };
  return { day: Number(found[2]), month: monthIndex(found[1]), rest: found[3] };
}

/** "4", "4.1" and "4 1" as { game: 4, part: null | 1 }. */
const numbered = (whole, part) => ({ game: Number(whole), part: part === undefined ? null : Number(part) });

/** Reads a title. Returns { day, month, sides, game, part, unknown } or { error }. game is null with no number. */
export function parseTitle(raw, names = loadNames()) {
  if (/\[[^\]]*\]/.test(raw)) return { error: "has a [bracketed note], so it is a video with no game" };
  const date = readDate(raw);
  if (date.error) return date;
  const { day, month } = date;
  let rest = date.rest;

  let number = { game: null, part: null };
  const first = rest.match(/^game ?(\d+) (.+)$/i);
  if (first) {
    number = numbered(first[1]);
    rest = first[2];
  }
  const paren = rest.match(/\s*\(([^)]*)\)\s*$/);
  if (paren) {
    const inside = paren[1].match(/^game\s*(\d+)(?:[. ](\d+))?/i);
    if (inside) number = numbered(inside[1], inside[2]);
    rest = rest.slice(0, paren.index);
  }
  // "... 2", "... Game 4", "... Game 4.1", "... Game 4 1", and a trailing note like "2 elongated".
  const suffix = rest.match(/ (?:game ?)?(\d+)(?:[. ](\d+))?((?: [a-z]+)*)$/i);
  if (suffix && !/^ [A-Z]/.test(suffix[3] ?? "")) {
    number = numbered(suffix[1], suffix[2]);
    rest = rest.slice(0, suffix.index);
  }

  const parts = rest.split(/ vs /i);
  if (parts.length !== 2) return { error: 'needs exactly one "vs" between two sides' };
  const sides = [];
  const unknown = [];
  for (const part of parts) {
    const side = readSide(part, names);
    if (side.error) return { error: side.error };
    sides.push(side.players);
    unknown.push(...side.unknown);
  }
  return { day, month, sides, ...number, unknown };
}

/** The latest year where the day falls on or before the upload date, with one day of slack for time zones. */
export function yearFor(day, month, uploaded) {
  const limit = uploaded.getTime() + 24 * 3600 * 1000;
  for (let year = uploaded.getUTCFullYear(); year > uploaded.getUTCFullYear() - 5; year--) {
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCMonth() === month && date.getTime() <= limit) return year;
  }
  return null;
}

/**
 * Puts the games of one day into matches. Rows need { sides, game, uploaded, videoId }, where game is the number in
 * the title or null. Returns matches in the order of their first upload, each
 * { name, teams, games }: the match's name, its two teams in letter order, and its games as { row, number, guessed } in
 * game order. `guessed` is true when the title had no number and the match has other games, so the number was a choice.
 *
 * Nothing here looks at another day, another pair or the playlist's order, and every tie breaks by (upload time,
 * video id), so a video uploaded later does not change what an earlier one got, except a game with no number (see above).
 */
export function groupMatches(rows) {
  const team = (players) => players.join("");
  const byTime = (a, b) => a.uploaded - b.uploaded || a.videoId.localeCompare(b.videoId);

  // The same two teams, in either order, are one pair. The name always lists the two teams in letter order.
  const pairs = new Map();
  for (const row of [...rows].sort(byTime)) {
    const [a, b] = [team(row.sides[0]), team(row.sides[1])].sort();
    const key = `${a} v ${b}`;
    pairs.set(key, [...(pairs.get(key) ?? []), { row, a, b }]);
  }

  const matches = [];
  for (const [key, group] of pairs) {
    // A numbered game goes to the first series that does not have that number yet. A repeat starts the next series.
    const series = [];
    for (const item of group.filter((g) => g.row.game !== null).sort((x, y) => x.row.game - y.row.game || byTime(x.row, y.row))) {
      const home = series.find((s) => !s.some((g) => g.number === item.row.game));
      const entry = { row: item.row, number: item.row.game };
      if (home) home.push(entry);
      else series.push([entry]);
    }
    // A game with no number joins the first series and takes the lowest number that series has free.
    const blank = group.filter((g) => g.row.game === null);
    if (blank.length && !series.length) series.push([]);
    const chosen = [];
    for (const item of blank) {
      const taken = new Set(series[0].map((g) => g.number));
      let number = 1;
      while (taken.has(number)) number++;
      const entry = { row: item.row, number, guessed: false };
      series[0].push(entry);
      chosen.push(entry);
    }
    // A game that is alone in its match is game 1 whatever the title says. With other games around it, the number was a choice.
    for (const entry of chosen) entry.guessed = series[0].length > 1;

    series.forEach((games, index) => {
      games.sort((x, y) => x.number - y.number);
      matches.push({ name: index === 0 ? key : `${key} ${index + 1}`, teams: [group[0].a, group[0].b], games });
    });
  }
  return matches.sort((x, y) => byTime(x.games[0].row, y.games[0].row));
}

const csvCell = (value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

function loadKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  for (const dir of [process.cwd(), resolve(HERE, "..")]) {
    const file = join(dir, ".env.local");
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("YOUTUBE_API_KEY="));
    if (line) return line.slice("YOUTUBE_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function playlistId(input) {
  try {
    return new URL(input).searchParams.get("list") ?? input;
  } catch {
    return input;
  }
}

async function fetchPlaylist(id, key) {
  const items = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({ part: "snippet,contentDetails", playlistId: id, maxResults: "50", key, ...(pageToken && { pageToken }) });
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) throw new Error(`YouTube said ${res.status} for playlist ${id}: ${body.error?.message ?? "no message"}`);
    items.push(...body.items);
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return items.map((item) => ({
    videoId: item.contentDetails.videoId,
    title: item.snippet.title,
    uploaded: item.contentDetails.videoPublishedAt ?? item.snippet.publishedAt,
    hasUploadDate: Boolean(item.contentDetails.videoPublishedAt),
  }));
}

/** Pulls "--flag value" out of args. */
function takeFlag(args, flag, fallback) {
  const at = args.indexOf(flag);
  return at >= 0 ? args.splice(at, 2)[1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const out = takeFlag(args, "--out", "playlists.csv");
  const namesFile = takeFlag(args, "--names", join(HERE, "playlist-names.json"));
  if (!args.length || !out) {
    console.error("Usage: node scripts/playlist-to-csv.mjs <playlist url or id>... [--out playlists.csv] [--names file.json]");
    process.exit(1);
  }
  const key = loadKey();
  if (!key) {
    console.error("No YOUTUBE_API_KEY in the environment or .env.local. See docs/runbook.md.");
    process.exit(1);
  }
  const names = loadNames(namesFile);

  const videos = new Map();
  for (const input of args) {
    const items = await fetchPlaylist(playlistId(input), key);
    console.error(`${playlistId(input)}: ${items.length} videos`);
    for (const item of items) if (!videos.has(item.videoId)) videos.set(item.videoId, item);
  }

  // Nothing stops the run and nothing is dropped. Whatever a person should look at goes in the row's comments.
  const rows = [];
  // A title that is not a game becomes a video with no game, on the day in its title or else its upload day.
  const clips = [];
  // Rows no day could be found for. They are written with a blank date, so the file step stops at them until one is written.
  const undated = [];
  const unknownNames = new Map();
  const isoOf = (year, month, day) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  const plainTitle = (video) => video.title.trim().replace(/\s+/g, " ");
  // Playlists list newest first. Reverse so the oldest comes first.
  [...videos.values()].reverse().forEach((video) => {
    const url = `https://youtu.be/${video.videoId}`;
    const noDay = (why) => undated.push({ date: "", title: plainTitle(video), url, kind: "video", notes: [`${why}. Write the date, then it imports as a video with no game`] });
    const uploaded = new Date(video.uploaded);
    if (Number.isNaN(uploaded.getTime())) return noDay("no upload date");

    const parsed = parseTitle(video.title, names);
    const asClip = (why) => {
      const found = readDate(video.title);
      const year = found.error ? null : yearFor(found.day, found.month, uploaded);
      const date = year ? isoOf(year, found.month, found.day) : uploaded.toISOString().slice(0, 10);
      const notes = [why, ...(year ? [] : [`no date in the title, used the upload date ${date}`])];
      clips.push({ date, title: plainTitle(video), url, kind: "video", videoId: video.videoId, notes });
    };
    if (parsed.error) return asClip(parsed.error);
    // "Game 4.2" is the second part of game 4. Only the first part is the game's video.
    if (parsed.part !== null && parsed.part > 1) return asClip(`part ${parsed.part} of game ${parsed.game}`);

    const year = yearFor(parsed.day, parsed.month, uploaded);
    if (!year) return noDay("no year fits before the upload date");
    const date = isoOf(year, parsed.month, parsed.day);
    const notes = [];
    const late = Math.round((uploaded.getTime() - Date.parse(date)) / 86400000);
    if (!video.hasUploadDate) notes.push("YouTube gave no upload date for this video, so the year is a guess");
    else if (late > 120) notes.push(`uploaded ${late} days after the game, so check the year`);
    for (const name of parsed.unknown) {
      unknownNames.set(name, (unknownNames.get(name) ?? 0) + 1);
      notes.push(`${name} is not in the names file`);
    }
    rows.push({ ...parsed, date, uploaded: uploaded.getTime(), videoId: video.videoId, url, notes });
  });

  // One day is one session. Each day's games are grouped into matches. Videos with no game follow the games of their day.
  const days = new Map();
  for (const row of rows) days.set(row.date, [...(days.get(row.date) ?? []), row]);
  const clipsOn = new Map();
  for (const clip of clips) clipsOn.set(clip.date, [...(clipsOn.get(clip.date) ?? []), clip]);

  const header = "date,session,match,game,title,url,kind,comments";
  const line = (r) => [r.date, "", r.match ?? "", r.game === undefined ? "" : String(r.game), r.title, r.url, r.kind ?? "", r.notes.join("; ")].map(csvCell).join(",");
  const count = { guessed: 0, late: 0 };
  let matchCount = 0;
  // One entry per day, so a file can be cut between days and never inside a session.
  const dayLines = [];
  for (const date of [...new Set([...days.keys(), ...clipsOn.keys()])].sort()) {
    const lines = [];
    for (const match of groupMatches(days.get(date) ?? [])) {
      matchCount++;
      for (const { row, number, guessed } of match.games) {
        // The title names the game, so each video has a name of its own. The game column says the same.
        const title = `${row.day} ${MONTHS[row.month][0].toUpperCase()}${MONTHS[row.month].slice(1)} ${match.teams[0]} vs ${match.teams[1]} Game ${number}`;
        const notes = guessed ? [`no number in the title, numbered ${number} by upload order`, ...row.notes] : row.notes;
        if (guessed) count.guessed++;
        if (row.notes.some((n) => n.includes("check the year") || n.includes("a guess"))) count.late++;
        lines.push(line({ date, match: match.name, game: number, title, url: row.url, notes }));
      }
    }
    for (const clip of clipsOn.get(date) ?? []) lines.push(line(clip));
    dayLines.push(lines);
  }
  if (undated.length) dayLines.push(undated.map(line));

  // The import takes at most 300 rows. A first load over that is cut between days. A day over 300 gets a file to itself,
  // which the import will refuse, and the person splits it by session.
  const files = [[]];
  const tooBig = [];
  for (const lines of dayLines) {
    if (lines.length > IMPORT_MAX_ROWS) {
      tooBig.push(lines.length);
      if (files.at(-1).length) files.push([]);
      files.at(-1).push(...lines);
      files.push([]);
      continue;
    }
    if (files.at(-1).length + lines.length > IMPORT_MAX_ROWS) files.push([]);
    files.at(-1).push(...lines);
  }
  const parts = files.filter((lines) => lines.length);
  const written = parts.map((lines, index) => {
    const file = parts.length === 1 ? out : out.replace(/(\.[^.\\/]+)?$/, `-${index + 1}$1`);
    writeFileSync(file, [header, ...lines].join("\n") + "\n");
    return `${file} (${lines.length} rows)`;
  });

  const sessionCount = new Set([...days.keys(), ...clipsOn.keys()]).size;
  console.error(`\nWrote ${rows.length} games and ${clips.length + undated.length} videos with no game: ${sessionCount} sessions, ${matchCount} matches.\n  ${written.join("\n  ")}`);
  // The detail is in the comments column. This only says how much there is to read.
  const unlinked = clips.length;
  const summary = [
    [count.guessed, "games numbered by guess (no number in the title)"],
    [unlinked, 'videos with no game (the title is not "A vs B", or it is a later part)'],
    [count.late, "games whose year or date is worth a check"],
    [undated.length, "rows with no date. The file step stops at them until you write one"],
    [tooBig.length, `days over ${IMPORT_MAX_ROWS} rows (${tooBig.join(", ")}). The import takes ${IMPORT_MAX_ROWS}, so split that file by session`],
  ].filter(([n]) => n > 0);
  if (summary.length) console.error(`\nRead the comments column before you import:\n  ${summary.map(([n, what]) => `${n} ${what}`).join("\n  ")}`);
  if (unknownNames.size) {
    const list = [...unknownNames].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`);
    console.error(`\nNames not in the names file, kept as written. Add them to playlist-names.json:\n  ${list.join(", ")}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
