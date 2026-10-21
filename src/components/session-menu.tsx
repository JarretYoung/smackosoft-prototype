"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMembers, removeSessions } from "@/src/app/actions";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { errorMessage } from "@/src/lib/errors";

/** The "..." menu on a session. Controls are hidden by role. The backend still checks. */
export function SessionMenu({
  sessionId,
  label,
  myAccountId,
  canEdit,
  canDelete,
  canLeave,
}: {
  sessionId: string;
  label: string;
  myAccountId: string;
  canEdit: boolean;
  canDelete: boolean;
  canLeave: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const result = await removeSessions([sessionId]);
      if (!result.ok) {
        toast.error(errorMessage(result.error));
        return;
      }
      toast.success("Session deleted");
      router.replace("/sessions");
    });
  }

  function leave() {
    start(async () => {
      const result = await removeMembers([{ sessionId, accountId: myAccountId }]);
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success("You left the session");
      router.replace("/sessions");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full bg-white/90 text-primary" aria-label="Session menu">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/sessions/${sessionId}/edit`}>Edit session</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/sessions/${sessionId}/videos`}>Videos</Link>
          </DropdownMenuItem>
          {canLeave && (
            <DropdownMenuItem onSelect={() => setLeaving(true)}>Leave session</DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                Delete session
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this session?</DialogTitle>
            <DialogDescription>
              You will no longer see {label}. A manager can add you back. If you play in a match, ask to be taken off it first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaving(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={leave} disabled={pending}>
              {pending ? "Leaving" : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription>
              {label} and all of its matches, scores and video links will be removed. The videos themselves stay in your library.
            </DialogDescription>
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
    </>
  );
}
