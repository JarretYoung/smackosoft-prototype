"use client";

import { useEffect, useRef, useState } from "react";
import { Progress } from "@/src/components/ui/progress";
import type { ImportReport } from "@/src/contract";
import { saveVideos } from "@/src/features/videos/actions";
import { DurationProbe } from "@/src/features/videos/duration-probe";
import { plural } from "@/src/lib/format";
import { youtubeIdOf } from "@/src/lib/video-source";

/** How many hidden players run at once. Each one is a YouTube embed, so keep it small. */
const AT_ONCE = 3;
/** A video that has not said its length by now is private, blocked or offline. It keeps no length. */
const GIVE_UP_MS = 20_000;
/** Lengths are saved in groups, so a long list is not one save per video and a closed page loses little. */
const SAVE_EVERY = 10;

type Video = ImportReport["videos"][number];

function Probe({ video, onDone }: { video: Video; onDone: (seconds: number | null) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [onDone]);
  return <DurationProbe link={video.url} onDuration={onDone} />;
}

/**
 * Reads the length of each new video in the browser, a few at a time, and saves them as they come.
 * The import saves no lengths, because a length comes from the player and that costs a hidden player
 * per video. Leaving the page stops it. A video with no length simply shows none.
 */
export function LengthReader({ videos }: { videos: Video[] }) {
  const [lengths, setLengths] = useState<Map<string, number | null>>(new Map());
  const saved = useRef(new Set<string>());
  const [failed, setFailed] = useState(false);

  const record = (id: string, seconds: number | null) =>
    setLengths((all) => (all.has(id) ? all : new Map(all).set(id, seconds)));
  // A link that is not YouTube has no player to ask, so it counts as read already.
  const settled = (v: Video) => lengths.has(v.id) || !youtubeIdOf(v.url);
  const active = videos.filter((v) => !settled(v)).slice(0, AT_ONCE);

  useEffect(() => {
    const ready = videos.filter((v) => (lengths.get(v.id) ?? 0) > 0 && !saved.current.has(v.id));
    const finished = videos.every((v) => lengths.has(v.id) || !youtubeIdOf(v.url));
    if (!ready.length || (ready.length < SAVE_EVERY && !finished)) return;
    for (const v of ready) saved.current.add(v.id);
    void saveVideos(ready.map((v) => ({ id: v.id, label: v.label, videoUrl: v.url, durationSeconds: lengths.get(v.id) }))).then((result) => {
      if (!result.ok) setFailed(true);
    });
  }, [lengths, videos]);

  if (!videos.length) return null;
  const done = videos.filter(settled).length;
  const read = [...lengths.values()].filter(Boolean).length;
  const finished = done === videos.length;

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card" aria-live="polite">
      {active.map((v) => (
        <Probe key={v.id} video={v} onDone={(seconds) => record(v.id, seconds)} />
      ))}
      <p className="text-subhead font-semibold">{finished ? "Video lengths are in" : "Reading video lengths"}</p>
      <Progress value={(done / videos.length) * 100} aria-label="Reading video lengths" />
      <p className="text-sm text-muted-foreground">
        {finished
          ? failed
            ? "Some lengths could not be saved. They show nothing for now."
            : `${plural(read, "video")} now show their length${read < videos.length ? `. ${videos.length - read} could not be read.` : "."}`
          : `${done} of ${videos.length}. You can leave this page, the games are already in.`}
      </p>
    </div>
  );
}
