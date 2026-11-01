"use client";

import { Check, EllipsisVertical, ExternalLink, Plus, Video } from "lucide-react";
import type { ReactNode } from "react";
import { CourtArt } from "@/src/components/court-art";
import { Button } from "@/src/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import type { SessionVideo } from "@/src/contract";
import { cn } from "@/src/lib/utils";
import { formatOffset, openUrl } from "@/src/features/videos/offset";
import { thumbnailOf } from "@/src/features/videos/player";
import type { PlaylistGame } from "@/src/features/videos/videos";
import { RelativeTime } from "./relative-time";

/** A small thumbnail for sheets and the unlinked list. */
export function Thumb({ url }: { url: string | null }) {
  return (
    <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
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
 * A 16:9 frame for a video: its own thumbnail, else YouTube's poster frame, else the drawn court with
 * the game number. `children` sit on top (the sync chip, the playing mark).
 */
export function VideoThumb({
  video,
  mark,
  className,
  children,
}: {
  video?: SessionVideo["video"];
  mark?: string;
  className?: string;
  children?: ReactNode;
}) {
  const url = video ? (video.thumbnailUrl ?? thumbnailOf(video.videoUrl)) : null;
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl bg-muted", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <CourtArt className="absolute inset-0" />
          {mark && <span className="score absolute inset-0 flex items-center justify-center text-5xl text-white/25">{mark}</span>}
        </>
      )}
      {children}
    </div>
  );
}

/** The number in "Game 3", for the placeholder frame. */
export const markOf = (game: PlaylistGame) => game.name.match(/Game (\d+)$/)?.[1];

/** Synced at 0:12, or not synced. It sits where YouTube puts the duration. */
function SyncChip({ offset }: { offset: number | null }) {
  return (
    <span
      role="img"
      aria-label={offset === null ? "Not synced" : `Synced at ${formatOffset(offset)}`}
      className={cn(
        "absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-semibold text-white tabular-nums",
        offset === null ? "bg-primary" : "bg-black/70",
      )}
    >
      {offset === null ? (
        "Not synced"
      ) : (
        <>
          <Check className="size-3" strokeWidth={3} /> {formatOffset(offset)}
        </>
      )}
    </span>
  );
}

/** "Ian, 2m ago". First name only, so the line stays short. */
function Who({ item }: { item: SessionVideo }) {
  return (
    <>
      {item.changedByName.split(" ")[0]}, <RelativeTime iso={item.changedAt} />
    </>
  );
}

function RowMenu({ item, label, children }: { item: SessionVideo; label: string; children?: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="bare" size="icon" className="-mr-2 shrink-0 text-muted-foreground" aria-label={`More for ${label}`}>
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild>
          <a href={openUrl(item.video.videoUrl, item.canonicalOffset)} target="_blank" rel="noreferrer">
            <ExternalLink /> Open in a new tab
          </a>
        </DropdownMenuItem>
        {children && <DropdownMenuSeparator />}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A game with a video: the video's thumbnail and its own label, then the game and the result. The row plays it. */
export function GameRow({
  game,
  item,
  angles,
  playing,
  canEdit,
  highlightId,
  onPlay,
  onSync,
  onRemove,
}: {
  game: PlaylistGame;
  item: SessionVideo;
  /** How many videos the game has. Shown only when it is more than one. */
  angles: number;
  playing: boolean;
  canEdit: boolean;
  highlightId?: string;
  onPlay: () => void;
  onSync: () => void;
  onRemove: () => void;
}) {
  const synced = item.canonicalOffset !== null;
  return (
    <li id={highlightId} className={cn("-mx-2 flex items-start gap-1 rounded-2xl p-2", playing && "bg-accent")}>
      <button type="button" onClick={onPlay} aria-label={`Play ${item.video.label}`} className="pressable flex min-w-0 flex-1 items-start gap-3 text-left">
        <VideoThumb video={item.video} mark={markOf(game)} className="w-40 shrink-0">
          {playing && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-caption font-semibold text-white">Playing</span>
          )}
          <SyncChip offset={item.canonicalOffset} />
        </VideoThumb>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-body leading-snug font-semibold tracking-tight">{item.video.label}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {game.name}
            {game.result && (
              <>
                {" · "}
                <span className="score">{game.result}</span>
              </>
            )}
            {angles > 1 && ` · ${angles} angles`}
          </p>
          <p className="truncate text-footnote text-muted-foreground">
            <Who item={item} />
          </p>
        </div>
      </button>
      <RowMenu item={item} label={item.video.label}>
        {canEdit && (
          <>
            <DropdownMenuItem onSelect={onSync}>{synced ? "Adjust sync point" : "Set sync point"}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              Remove from game
            </DropdownMenuItem>
          </>
        )}
      </RowMenu>
    </li>
  );
}

/** A game with no video yet. An editor adds one, anyone else just sees that it has none. */
export function EmptyGameRow({ game, canEdit, onAdd }: { game: PlaylistGame; canEdit: boolean; onAdd: () => void }) {
  const detail = (
    <p className="mt-0.5 truncate text-sm text-muted-foreground">
      {game.name}
      {game.result && (
        <>
          {" · "}
          <span className="score">{game.result}</span>
        </>
      )}
    </p>
  );
  const frame = "flex aspect-video w-40 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border";
  if (!canEdit) {
    return (
      <li className="flex items-start gap-3">
        <div className={cn(frame, "text-muted-foreground")}>
          <Video className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body leading-snug font-semibold tracking-tight text-muted-foreground">No video yet</p>
          {detail}
        </div>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onAdd} aria-label={`Add a video to ${game.name}`} className="pressable flex w-full items-start gap-3 text-left">
        <div className={cn(frame, "text-primary")}>
          <Plus className="size-6" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body leading-snug font-semibold tracking-tight text-primary">Add a video</p>
          {detail}
        </div>
      </button>
    </li>
  );
}

/** A video that no game uses yet. The whole row opens the game picker. */
export function UnlinkedRow({
  item,
  canEdit,
  highlightId,
  onAssign,
  onRemove,
}: {
  item: SessionVideo;
  canEdit: boolean;
  highlightId?: string;
  onAssign: () => void;
  onRemove: () => void;
}) {
  const body = (
    <>
      <Thumb url={item.video.thumbnailUrl ?? thumbnailOf(item.video.videoUrl)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold tracking-tight">{item.video.label}</p>
        <p className="truncate text-sm text-muted-foreground">
          <Who item={item} />
        </p>
      </div>
      {canEdit && <span className="text-subhead font-semibold text-primary">Link</span>}
    </>
  );
  return (
    <li id={highlightId} className="flex items-center gap-1 py-2.5 pr-2 pl-4">
      {canEdit ? (
        <button type="button" onClick={onAssign} className="pressable-row -my-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left">
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <RowMenu item={item} label={item.video.label}>
        {canEdit && (
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            Remove from session
          </DropdownMenuItem>
        )}
      </RowMenu>
    </li>
  );
}
