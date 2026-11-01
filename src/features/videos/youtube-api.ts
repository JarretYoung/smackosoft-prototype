"use client";

import { youtubeIdOf } from "@/src/features/videos/player";

/** The little of YouTube's player API we use. */
type YouTubePlayer = { getDuration(): number; destroy(): void };
type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: { videoId: string; events: { onReady: () => void; onError: () => void } },
  ) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | null = null;

/** Loads YouTube's player API once. Rejects if the script cannot load. */
function loadApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      loading = null;
      reject(new Error("The YouTube player API did not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The length of a YouTube video in whole seconds, read from a player that is never shown or played.
 * Null for any other link, and when it cannot be read in time (offline, a private video, a blocked embed).
 * It never throws, so a failure never stops a video from being added.
 */
export async function readDuration(link: string, timeoutMs = 6000): Promise<number | null> {
  const id = youtubeIdOf(link);
  if (!id) return null;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:120px;overflow:hidden";
  document.body.appendChild(host);
  let player: YouTubePlayer | undefined;
  try {
    const api = await loadApi();
    return await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      const done = (seconds: number | null) => {
        clearTimeout(timer);
        resolve(seconds);
      };
      const target = document.createElement("div");
      host.appendChild(target);
      player = new api.Player(target, {
        videoId: id,
        events: {
          onReady: () => {
            const seconds = Math.round(player?.getDuration() ?? 0);
            done(seconds > 0 ? seconds : null);
          },
          onError: () => done(null),
        },
      });
    });
  } catch {
    return null;
  } finally {
    player?.destroy();
    host.remove();
  }
}
