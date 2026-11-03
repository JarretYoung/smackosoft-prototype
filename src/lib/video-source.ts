/**
 * Which video a link points at, however the link is written. Shared by the server (the `source_key`
 * column) and the page (the player), so both read a link the same way.
 */

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

/**
 * Names the video a link points at, such as `youtube:dQw4w9WgXcQ`, whatever the link shape or extra
 * parameters (a playlist, a start time). Null for a link we do not recognise.
 * Add a provider by teaching this one more link shape.
 */
export function sourceKeyOf(link: string): string | null {
  const youtube = youtubeIdOf(link);
  return youtube ? `youtube:${youtube}` : null;
}
