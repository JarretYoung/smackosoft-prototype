"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMembers, removeSessions } from "@/src/app/actions";
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
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/20 text-white backdrop-blur hover:bg-white/30 hover:text-white"
            aria-label="Session menu"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/sessions/${sessionId}/edit`}>Edit session</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/sessions/${sessionId}/videos`}>Videos</Link>
          </DropdownMenuItem>
          {canLeave && <DropdownMenuItem onSelect={() => setLeaving(true)}>Leave session</DropdownMenuItem>}
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

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this session?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer see {label}. A manager can add you back. If you play in a match, ask to be taken off
              it first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                leave();
              }}
            >
              {pending ? "Leaving" : "Leave session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {label} and all of its matches, scores and video links will be removed. The videos themselves stay in
              your library.
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
              {pending ? "Deleting" : "Delete session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
