/**
 * How a video link plays in the page. A link is playable when we know how to embed it. Today that is
 * YouTube only, as an iframe on the privacy friendly embed host, started at the sync point.
 * Anything else is not playable here and opens in a new tab.
 * Add a provider by teaching `playableOf` one more link shape and the player one more `kind`.
 */
export type Playable = { kind: "youtube"; src: string };

const YOUTUBE_ID = /^[\w-]{11}$/;

function parse(link: string): URL | null {
  try {
    const url = new URL(link);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

/** The 11 character id of a YouTube link: watch, youtu.be, shorts, live and embed shapes. Null for anything else. */
export function youtubeIdOf(link: string): string | null {
  const url = parse(link);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [kind, value] = url.pathname.split("/").filter(Boolean);
    if (kind === "watch") id = url.searchParams.get("v");
    else if (["shorts", "live", "embed"].includes(kind)) id = value;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** The poster frame YouTube keeps for every video, 16:9. A plain image address, no key needed. Null for other links. */
export function thumbnailOf(link: string): string | null {
  const id = youtubeIdOf(link);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** Whole seconds to start from. The sync point can be negative when the video began after the game did. */
const startOf = (offset: number | null) => Math.max(0, Math.floor(offset ?? 0));

export function playableOf(link: string, offset: number | null): Playable | null {
  const id = youtubeIdOf(link);
  if (!id) return null;
  const params = new URLSearchParams({ start: String(startOf(offset)), autoplay: "1", playsinline: "1", rel: "0" });
  return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
}
