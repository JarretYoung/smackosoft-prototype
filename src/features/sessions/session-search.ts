import MiniSearch from "minisearch";
import type { SessionListItem } from "../../contract";
import { monthFor } from "../../lib/format";
import { viewerDay } from "./session-days";

/** The words a person might type for a day: "sat saturday 24 oct october 2026 2026-10-24". */
function dayWords(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const at = new Date(Date.UTC(year, month - 1, date));
  const weekday = (style: "short" | "long") => at.toLocaleDateString("en-GB", { weekday: style, timeZone: "UTC" });
  const monthLong = monthFor(day, `${year}-01-01`);
  return [weekday("short"), weekday("long"), String(date), monthLong.slice(0, 3), monthLong, String(year), day].join(" ");
}

/**
 * Search over what a session list already holds: the name, the place, the day as words, and who is in it. A word may
 * start a longer one ("ia" finds Ian), a wrong letter is forgiven in words of four letters or more, and every word
 * must be found somewhere: "ian oct" is a session with Ian, in October. It runs in the browser on data already loaded, so
 * a result shows as you type. Give the list the page shows, in the viewer's zone.
 */
export function sessionSearch(sessions: readonly SessionListItem[], viewerZone: string) {
  const index = new MiniSearch({
    fields: ["label", "location", "people", "when"],
    idField: "id",
    searchOptions: {
      prefix: true,
      // A typo in a name or place is forgiven. A number is not: 2025 is not 2026.
      fuzzy: (term) => (term.length >= 4 && !/\d/.test(term) ? 0.2 : false),
      combineWith: "AND",
      boost: { label: 2 },
    },
  });
  index.addAll(
    sessions.map((session) => ({
      id: session.id,
      label: session.label,
      location: session.location ?? "",
      // A guest's handle is made up, so only a real handle is worth finding.
      people: session.members.map((m) => (m.isGuest ? m.displayName : `${m.displayName} ${m.handle}`)).join(" "),
      when: dayWords(viewerDay(session, viewerZone)),
    })),
  );
  /** The ids of the sessions that match, or null when nothing is typed, which means all of them. */
  return (query: string): Set<string> | null => {
    const text = query.trim();
    return text ? new Set(index.search(text).map((hit) => String(hit.id))) : null;
  };
}
