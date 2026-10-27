"use client";

import { ExternalLink, Link2, Plus, Unlink, Video } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeLinkages, saveLinkages, saveVideos } from "@/src/app/actions";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
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
    <div className="flex h-12 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Video className="size-5" />
      )}
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
    <div className="flex flex-col gap-8 px-4 pt-4 pb-4">
      <section aria-labelledby="linked-heading" className="flex flex-col gap-4">
        <h2 id="linked-heading" className="text-xl font-bold tracking-tight">
          {focus ? `Linked to ${labelOf(focus)}` : "Linked to this session"}
        </h2>
        {ordered.length === 0 && (
          <Empty className="bg-card shadow-card">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-accent text-primary">
                <Video />
              </EmptyMedia>
              <EmptyTitle>Nothing linked yet</EmptyTitle>
              <EmptyDescription>Link one of your videos to the session or to a single game.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {ordered.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <p className="section-label">{key === SESSION ? "Whole session" : labelOf(key)}</p>
            <ul className="group-list">
              {groups.get(key)!.map((item) => (
                <li key={`${item.videoId}:${item.matchGameId}`} className="flex items-center gap-3 px-3 py-3">
                  <Thumb url={item.video.thumbnailUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.video.label}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">Starts at {clock(item.offsetSeconds)}</p>
                  </div>
                  <Button asChild variant="tinted" size="icon-sm" aria-label="Open video">
                    <a href={`${item.video.videoUrl}#t=${Math.floor(item.offsetSeconds)}`} target="_blank" rel="noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
          <Button asChild variant="link" className="self-start px-1">
            <Link href={`/sessions/${sessionId}/videos`}>Show everything in this session</Link>
          </Button>
        )}
      </section>

      <section aria-labelledby="own-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="own-heading" className="text-xl font-bold tracking-tight">
            Your videos
          </h2>
          <Button size="sm" variant="tinted" onClick={() => setAdding(true)}>
            <Plus /> Add video
          </Button>
        </div>
        {own.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">You have not added any videos.</p>
        ) : (
          <ul className="group-list">
            {own.map((video) => (
              <li key={video.id} className="flex items-center gap-3 px-3 py-3">
                <Thumb url={video.thumbnailUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{video.label}</p>
                  <p className="truncate text-sm text-muted-foreground">{video.videoUrl}</p>
                </div>
                {video.linkages.length > 0 && <Badge variant="tinted">{video.linkages.length} linked</Badge>}
                {canEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
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
        )}
      </section>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader className="px-5 pt-2 pb-0">
            <SheetTitle>Add a video</SheetTitle>
            <SheetDescription>
              This saves a record with the video link. Uploading files is not part of this prototype.
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="px-5">
            <Field>
              <FieldLabel htmlFor="video-label">Name</FieldLabel>
              <Input id="video-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Court 3 recording" />
            </Field>
            <Field>
              <FieldLabel htmlFor="video-url">Link</FieldLabel>
              <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
            </Field>
            <Field>
              <FieldLabel htmlFor="video-thumb">Thumbnail</FieldLabel>
              <Input
                id="video-thumb"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="Link to an image (optional)"
                inputMode="url"
              />
            </Field>
          </FieldGroup>
          <SheetFooter className="px-5 pb-6">
            <Button size="lg" onClick={addVideo} disabled={pending || !label.trim() || !url.trim()}>
              {pending && <Spinner />}
              {pending ? "Adding" : "Add video"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={linking !== null} onOpenChange={(open) => !open && setLinking(null)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader className="px-5 pt-2 pb-0">
            <SheetTitle>Link {linking?.label}</SheetTitle>
            <SheetDescription>Pick where it belongs and where in the video it starts.</SheetDescription>
          </SheetHeader>
          <FieldGroup className="px-5">
            <Field>
              <FieldLabel htmlFor="link-target">Link to</FieldLabel>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="link-target" aria-label="Link target" className="w-full">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="offset">Starts at</FieldLabel>
              <Input id="offset" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="0:00 or seconds" />
            </Field>
          </FieldGroup>
          <SheetFooter className="px-5 pb-6">
            <Button size="lg" onClick={link} disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Linking" : "Link video"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
