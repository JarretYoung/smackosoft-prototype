"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
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

/**
 * Guard against losing work. A form reports whether it has unsaved changes. Anything that
 * would leave the page then asks first, and closing the tab warns too.
 * It lives outside React state because the back button and the form are far apart in the tree.
 * Every form feeds it from `useAppForm`, which reports the form's own dirty state.
 */
let dirty = false;

/** Call from a form with "has the person changed anything". Clears itself when the form unmounts. */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    dirty = isDirty;
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  useEffect(() => () => void (dirty = false), []);
}

/**
 * Run an action that leaves the page, after confirming when there are unsaved changes.
 * Render `dialog` once next to the caller. `discard(action)` runs the action at once when
 * nothing is unsaved, otherwise after the person chooses Discard.
 */
export function useConfirmDiscard(): { discard: (action: () => void) => void; dialog: ReactNode } {
  const [pending, setPending] = useState<(() => void) | null>(null);

  const discard = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };

  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>What you entered here has not been saved.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Keep editing</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              dirty = false;
              pending?.();
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { discard, dialog };
}

/** A link that confirms first when the page has unsaved changes. Behaves like a plain link otherwise. */
export function LeaveLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const { discard, dialog } = useConfirmDiscard();

  return (
    <>
      <Link
        href={href}
        onClick={(event) => {
          onClick?.(event);
          if (!dirty || event.defaultPrevented) return;
          event.preventDefault();
          discard(() => router.push(href.toString()));
        }}
        {...props}
      />
      {dialog}
    </>
  );
}
