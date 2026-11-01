"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMatches } from "@/src/features/matches/actions";
import { addMatch, nounOf } from "@/src/features/matches/add-match";
import type { MatchFormat, MatchType } from "@/src/contract";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { errorMessage } from "@/src/lib/errors";
import { LeaveLink, useConfirmDiscard } from "@/src/hooks/unsaved-changes";
import { cn } from "@/src/lib/utils";

type Item = { id: string; label: string; format: MatchFormat; matchType: MatchType };

/** Previous and next match, add a game or a match, delete the current one. */
export function MatchSwitcher({
  sessionId,
  matches,
  currentId,
}: {
  sessionId: string;
  matches: Item[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const { discard, dialog: discardDialog } = useConfirmDiscard();

  const base = `/sessions/${sessionId}/matches/edit`;
  const index = matches.findIndex((m) => m.id === currentId);
  const current = matches[index];
  const prev = index > 0 ? matches[index - 1] : null;
  const next = index >= 0 && index < matches.length - 1 ? matches[index + 1] : null;

  function add(format: MatchFormat) {
    start(async () => {
      const added = await addMatch(sessionId, format, matches);
      if (!added.ok) return void toast.error(errorMessage(added.error));
      router.push(`${base}?m=${added.data}`);
    });
  }

  function remove() {
    if (!current) return;
    start(async () => {
      const result = await removeMatches([current.id]);
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success(`${current.format === "BO1" ? "Game" : "Match"} deleted`);
      setConfirming(false);
      const other = next ?? prev;
      router.replace(other ? `${base}?m=${other.id}` : base);
    });
  }

  const arrow = (target: Item | null, Icon: typeof ChevronLeft, label: string) =>
    target ? (
      <LeaveLink
        href={`${base}?m=${target.id}`}
        aria-label={label}
        className={buttonVariants({ variant: "bare", size: "icon" })}
      >
        <Icon className="size-6" strokeWidth={2.5} />
      </LeaveLink>
    ) : (
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full text-muted-foreground opacity-40">
        <Icon className="size-6" strokeWidth={2.5} />
      </span>
    );

  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <div className="flex flex-1 items-center justify-between rounded-full bg-card p-1 shadow-card">
        {arrow(prev, ChevronLeft, "Previous")}
        <span className={cn("text-subhead font-semibold tabular-nums", !current && "text-muted-foreground")}>
          {current ? `${current.label} · ${index + 1} of ${matches.length}` : "Nothing yet"}
        </span>
        {arrow(next, ChevronRight, "Next")}
      </div>
      {discardDialog}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={pending} aria-label="Add a game or match">
            <Plus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={() => discard(() => add("BO1"))}>Game</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => discard(() => add("BO3"))}>Match</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-destructive"
        onClick={() => setConfirming(true)}
        disabled={!current || pending}
        aria-label={`Delete ${current ? nounOf(current.format) : "match"}`}
      >
        <Trash2 />
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {current?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {current?.format === "BO1"
                ? "Its teams, score and video links will be removed."
                : "Its teams, games, scores and video links will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending ? "Deleting" : `Delete ${current ? nounOf(current.format) : "match"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
