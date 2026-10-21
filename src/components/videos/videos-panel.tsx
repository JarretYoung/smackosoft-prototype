"use client";

import { ExternalLink, Link2, Plus, Unlink } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeLinkages, saveLinkages, saveVideos } from "@/src/app/actions";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import type { OwnVideo, SessionVideo } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";

export type Target = { value: string; label: string };
const SESSION = "session";

const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** "1:30" or "90" to seconds. Null when it is not a time. */
function parseOffset(text: string): number | null {
  const t = text.trim();
  if (t === "") return 0;
  const match = /^(?:(\d+):)?(\d+)$/.exec(t);
  if (!match) return null;
  return Number(match[1] ?? 0) * 60 + Number(match[2]);
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </div>
  );
}

/**
 * Videos for one session. Add a video record, link your videos to the whole session
 * or to one game, and unlink them. Linking is replay safe. Linking the same target
 * again only updates the offset.
 */
export function VideosPanel({
  sessionId,
  canEdit,
  targets,
  linked,
  own,
  focus,
}: {
  sessionId: string;
  canEdit: boolean;
  targets: Target[];
  linked: SessionVideo[];
  own: OwnVideo[];
  focus: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState<OwnVideo | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [target, setTarget] = useState(focus ?? SESSION);
  const [offset, setOffset] = useState("");
  const [pending, start] = useTransition();

  const labelOf = (matchGameId: string | null) =>
    matchGameId ? (targets.find((t) => t.value === matchGameId)?.label ?? "A game") : "Whole session";
  const keyOf = (matchGameId: string | null) => matchGameId ?? SESSION;

  const groups = new Map<string, SessionVideo[]>();
  for (const item of linked) {
    if (focus && item.matchGameId !== focus) continue;
    const key = keyOf(item.matchGameId);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const ordered = [SESSION, ...targets.map((t) => t.value)].filter((k) => groups.has(k));

  function run(action: () => Promise<{ ok: true } | { ok: false; error: Parameters<typeof errorMessage>[0] }>, done: string, then?: () => void) {
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success(done);
      then?.();
    });
  }

  function addVideo() {
    run(
      () =>
        saveVideos([
          {
            id: crypto.randomUUID(),
            label,
            videoUrl: url.trim(),
            thumbnailUrl: thumbnail.trim() === "" ? null : thumbnail.trim(),
          },
        ]),
      "Video added",
      () => {
        setAdding(false);
        setLabel("");
        setUrl("");
        setThumbnail("");
      },
    );
  }

  function link() {
    if (!linking) return;
    const seconds = parseOffset(offset);
    if (seconds === null) return void toast.error("Use seconds like 90, or minutes and seconds like 1:30");
    run(
      () =>
        saveLinkages([
          { videoId: linking.id, sessionId, matchGameId: target === SESSION ? null : target, offsetSeconds: seconds },
        ]),
      "Video linked",
      () => {
        setLinking(null);
        setOffset("");
      },
    );
  }

  return (
    <div className="space-y-8 px-5 pb-6 pt-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {focus ? `Linked to ${labelOf(focus)}` : "Linked to this session"}
        </h2>
        {ordered.length === 0 && (
          <p className="rounded-2xl border border-dashed bg-card p-5 text-center text-sm text-muted-foreground">
            Nothing is linked yet.
          </p>
        )}
        {ordered.map((key) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {key === SESSION ? "Whole session" : labelOf(key)}
            </p>
            <ul className="divide-y rounded-2xl border bg-card">
              {groups.get(key)!.map((item) => (
                <li key={`${item.videoId}:${item.matchGameId}`} className="flex items-center gap-3 p-3">
                  <Thumb url={item.video.thumbnailUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.video.label}</p>
                    <p className="text-xs text-muted-foreground">Starts at {clock(item.offsetSeconds)}</p>
                  </div>
                  <Button asChild variant="ghost" size="icon" aria-label="Open video">
                    <a href={`${item.video.videoUrl}#t=${Math.floor(item.offsetSeconds)}`} target="_blank" rel="noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Unlink ${item.video.label}`}
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            removeLinkages([
                              { videoId: item.videoId, sessionId, matchGameId: item.matchGameId },
                            ]),
                          "Video unlinked",
                        )
                      }
                    >
                      <Unlink />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {focus && (
          <Button asChild variant="link" className="px-0">
            <a href={`/sessions/${sessionId}/videos`}>Show everything in this session</a>
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Your videos</h2>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus /> Add video
          </Button>
        </div>
        {own.length === 0 && <p className="text-sm text-muted-foreground">You have not added any videos.</p>}
        <ul className="divide-y rounded-2xl border bg-card empty:hidden">
          {own.map((video) => (
            <li key={video.id} className="flex items-center gap-3 p-3">
              <Thumb url={video.thumbnailUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{video.label}</p>
                <p className="truncate text-xs text-muted-foreground">{video.videoUrl}</p>
              </div>
              {video.linkages.length > 0 && <Badge variant="secondary">{video.linkages.length} linked</Badge>}
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setLinking(video);
                    setTarget(focus ?? SESSION);
                  }}
                >
                  <Link2 /> Link
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a video</DialogTitle>
            <DialogDescription>
              This saves a record with the video link. Uploading files is not part of this prototype.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="video-label">Name</Label>
              <Input id="video-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Court 3 recording" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">Link</Label>
              <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-thumb">Thumbnail</Label>
              <Input
                id="video-thumb"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="Link to an image (optional)"
                inputMode="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={addVideo} disabled={pending || !label.trim() || !url.trim()}>
              {pending ? "Adding" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linking !== null} onOpenChange={(open) => !open && setLinking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link {linking?.label}</DialogTitle>
            <DialogDescription>Pick where it belongs and where in the video it starts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Link to</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger aria-label="Link target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SESSION}>Whole session</SelectItem>
                  {targets.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offset">Starts at</Label>
              <Input id="offset" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="0:00 or seconds" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinking(null)}>
              Cancel
            </Button>
            <Button onClick={link} disabled={pending}>
              {pending ? "Linking" : "Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
