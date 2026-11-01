import { toast } from "sonner";

/** Long enough to read the message and reach the button, which the 4 second default is not. */
const UNDO_MS = 8000;

/** Say that something was removed from the draft, with a button to bring it back. */
export function undoToast(message: string, onUndo: () => void) {
  toast(message, { duration: UNDO_MS, action: { label: "Undo", onClick: onUndo } });
}
