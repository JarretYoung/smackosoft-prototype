import type { VideoSource } from "./types";

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
function idOf(link: string): string | null {
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

export const youtube: VideoSource = {
  id: "youtube",
  idOf,
  // The poster frame YouTube keeps for every video, 16:9. A plain image address, no key needed.
  thumbnailOf: (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
};
