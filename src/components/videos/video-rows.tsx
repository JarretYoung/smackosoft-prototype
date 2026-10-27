"use client";

import { ExternalLink, MoreHorizontal, Plus, Video } from "lucide-react";
import type { ReactNode } from "react";
import { RelativeTime } from "@/src/components/relative-time";
import { Button } from "@/src/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import type { SessionVideo } from "@/src/contract";
import { formatOffset, openUrl } from "@/src/lib/offset";

export function Thumb({ url }: { url: string | null }) {
  return (
    <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Video className="size-5" />
      )}
    </div>
  );
}

/** "Ian, 2m ago". First name only, so the line stays short. */
function Who({ item }: { item: SessionVideo }) {
  return (
    <>
      {item.changedBy.split(" ")[0]}, <RelativeTime iso={item.changedAt} />
    </>
  );
}

function RowMenu({ item, label, children }: { item: SessionVideo; label: string; children?: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`More for ${label}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild>
          <a href={openUrl(item.video.videoUrl, item.offsetSeconds)} target="_blank" rel="noreferrer">
            <ExternalLink /> Open video
          </a>
        </DropdownMenuItem>
        {children && <DropdownMenuSeparator />}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ROW = "flex items-center gap-1 py-2.5 pr-2 pl-4";
const TAP = "pressable-row -my-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left";

/** A video in a game, with its sync state. The whole row opens the sync sheet. */
export function GameVideoRow({
  item,
  canEdit,
  highlightId,
  onSync,
  onRemove,
}: {
  item: SessionVideo;
  canEdit: boolean;
  highlightId?: string;
  onSync: () => void;
  onRemove: () => void;
}) {
  const synced = item.offsetSeconds !== null;
  const body = (
    <>
      <Thumb url={item.video.thumbnailUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.video.label}</p>
        <p className="truncate text-[0.8125rem] text-muted-foreground">
          {synced ? (
            <span className="tabular-nums">Synced at {formatOffset(item.offsetSeconds!)}</span>
          ) : (
            <span className="font-medium text-accent-foreground">Not synced</span>
          )}
          {" · "}
          <Who item={item} />
        </p>
      </div>
    </>
  );
  return (
    <li id={highlightId} className={ROW}>
      {canEdit ? (
        <button type="button" onClick={onSync} className={TAP}>
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
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

/** A video that no game uses yet. The whole row opens the game picker. */
export function UnassignedRow({
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
      <Thumb url={item.video.thumbnailUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.video.label}</p>
        <p className="truncate text-[0.8125rem] text-muted-foreground">
          <Who item={item} />
        </p>
      </div>
      {canEdit && <span className="text-[0.9375rem] font-semibold text-primary">Assign</span>}
    </>
  );
  return (
    <li id={highlightId} className={ROW}>
      {canEdit ? (
        <button type="button" onClick={onAssign} className={TAP}>
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <RowMenu item={item} label={item.video.label}>
        {canEdit && (
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            Remove video
          </DropdownMenuItem>
        )}
      </RowMenu>
    </li>
  );
}

/** The last row of a game: a quiet add action, the way iOS lists end. */
export function AddVideoRow({ onClick }: { onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="pressable-row flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-primary">
        <Plus className="size-[1.125rem]" strokeWidth={2.5} /> Add video
      </button>
    </li>
  );
}
