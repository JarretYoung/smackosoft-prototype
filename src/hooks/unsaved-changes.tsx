"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
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
    <DiscardDialog
      open={pending !== null}
      onKeep={() => setPending(null)}
      onDiscard={() => {
        dirty = false;
        pending?.();
      }}
    />
  );

  return { discard, dialog };
}

/**
 * The same guard for a sheet that holds a small form. The form reports its dirty state with
 * `setDirty`, and anything that would close the sheet (the close button, a tap outside, Cancel)
 * goes through `guard(close)`. A save closes the sheet directly, so it never asks.
 * It keeps its own state, apart from the page guard above, because a sheet closes in place.
 */
export function useSheetDiscard(): {
  setDirty: (isDirty: boolean) => void;
  guard: (close: () => void) => void;
  dialog: ReactNode;
} {
  const sheetDirty = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  return {
    setDirty: (isDirty) => void (sheetDirty.current = isDirty),
    guard: (close) => {
      if (sheetDirty.current) setPending(() => close);
      else close();
    },
    dialog: (
      <DiscardDialog
        open={pending !== null}
        onKeep={() => setPending(null)}
        onDiscard={() => {
          sheetDirty.current = false;
          pending?.();
          setPending(null);
        }}
      />
    ),
  };
}

function DiscardDialog({ open, onKeep, onDiscard }: { open: boolean; onKeep: () => void; onDiscard: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeep()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>What you entered here has not been saved.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
