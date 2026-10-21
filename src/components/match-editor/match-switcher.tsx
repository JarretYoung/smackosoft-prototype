"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMatches, saveMatches, saveTeams } from "@/src/app/actions";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { errorMessage } from "@/src/lib/errors";
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
      <Link href={`${base}?m=${target.id}`} aria-label={label} className="flex size-9 items-center justify-center rounded-full hover:bg-accent">
        <Icon className="size-5" />
      </Link>
    ) : (
      <span className="flex size-9 items-center justify-center rounded-full opacity-30">
        <Icon className="size-5" />
      </span>
    );

  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <div className="flex flex-1 items-center justify-between rounded-2xl bg-card px-2 py-1.5 shadow-xs ring-1 ring-border">
        {arrow(prev, ChevronLeft, "Previous match")}
        <span className={cn("text-sm font-semibold", !current && "text-muted-foreground")}>
          {current ? `${current.label} (${index + 1} of ${matches.length})` : "No matches"}
        </span>
        {arrow(next, ChevronRight, "Next match")}
      </div>
      <Button type="button" variant="outline" size="icon" className="size-11 rounded-2xl" onClick={add} disabled={pending} aria-label="Add match">
        <Plus />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="size-11 rounded-2xl"
        onClick={() => setConfirming(true)}
        disabled={!current || pending}
        aria-label="Delete match"
      >
        <Trash2 />
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {current?.label}?</DialogTitle>
            <DialogDescription>Its teams, games, scores and video links will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
