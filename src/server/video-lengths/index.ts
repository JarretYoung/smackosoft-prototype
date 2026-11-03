/**
 * How long a video is, whatever its source. The server calls `lengthsOf` with links and gets seconds back
 * for the ones it could read. Which service answers is decided here, by the link's source (`lib/video-sources`).
 * Add a source: write its `LengthSource` in this folder and add it to `defaultSources`.
 */
import { refOf } from "../../lib/video-sources";
import type { LengthSource } from "./types";
import { youtubeLengths } from "./youtube";

export type { LengthSource } from "./types";

/** Built on each call, so a key set after start-up, or in a test, is picked up. */
const defaultSources = (): LengthSource[] => [youtubeLengths({ key: process.env.YOUTUBE_API_KEY })];

/** Seconds by link, for the links whose length could be read. A link no source claims, or cannot read, is missing. */
export async function lengthsOf(links: string[], sources: LengthSource[] = defaultSources()): Promise<Map<string, number>> {
  const idsBySource = new Map<string, Map<string, string[]>>();
  for (const link of links) {
    const ref = refOf(link);
    if (!ref) continue;
    const byId = idsBySource.get(ref.source.id) ?? new Map<string, string[]>();
    byId.set(ref.id, [...(byId.get(ref.id) ?? []), link]);
    idsBySource.set(ref.source.id, byId);
  }

  const found = new Map<string, number>();
  await Promise.all(
    sources.map(async (source) => {
      const byId = idsBySource.get(source.id);
      if (!byId) return;
      const seconds = await source.lengthsOf([...byId.keys()]);
      for (const [id, length] of seconds) for (const link of byId.get(id) ?? []) found.set(link, length);
    }),
  );
  return found;
}
