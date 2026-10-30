"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMatches, saveMatches, saveTeams } from "@/src/app/actions";
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
import { Button } from "@/src/components/ui/button";
import { errorMessage } from "@/src/lib/errors";
import { LeaveLink, useConfirmDiscard } from "@/src/lib/unsaved-changes";
import { cn } from "@/src/lib/utils";

type Item = { id: string; label: string };

/** Previous and next match, add a match, delete the current one. */
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

  function add() {
    start(async () => {
      const id = crypto.randomUUID();
      const created = await saveMatches([{ id, sessionId, label: `Match ${matches.length + 1}`, matchType: "MD" }]);
      if (!created.ok) return void toast.error(errorMessage(created.error));
      const teams = await saveTeams([
        { id: crypto.randomUUID(), matchId: id, label: "Team 1" },
        { id: crypto.randomUUID(), matchId: id, label: "Team 2" },
      ]);
      if (!teams.ok) return void toast.error(errorMessage(teams.error));
      router.push(`${base}?m=${id}`);
    });
  }

  function remove() {
    if (!current) return;
    start(async () => {
      const result = await removeMatches([current.id]);
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success("Match deleted");
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
        className="pressable flex size-11 items-center justify-center rounded-full text-primary hover:bg-muted"
      >
        <Icon className="size-5" strokeWidth={2.5} />
      </LeaveLink>
    ) : (
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full text-muted-foreground opacity-40">
        <Icon className="size-5" strokeWidth={2.5} />
      </span>
    );

  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <div className="flex flex-1 items-center justify-between rounded-full bg-card p-1 shadow-card">
        {arrow(prev, ChevronLeft, "Previous match")}
        <span className={cn("text-subhead font-semibold tabular-nums", !current && "text-muted-foreground")}>
          {current ? `${current.label} · ${index + 1} of ${matches.length}` : "No matches"}
        </span>
        {arrow(next, ChevronRight, "Next match")}
      </div>
      {discardDialog}
      <Button type="button" variant="outline" size="icon" onClick={() => discard(add)} disabled={pending} aria-label="Add match">
        <Plus />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-destructive"
        onClick={() => setConfirming(true)}
        disabled={!current || pending}
        aria-label="Delete match"
      >
        <Trash2 />
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {current?.label}?</AlertDialogTitle>
            <AlertDialogDescription>Its teams, games, scores and video links will be removed.</AlertDialogDescription>
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
              {pending ? "Deleting" : "Delete match"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
