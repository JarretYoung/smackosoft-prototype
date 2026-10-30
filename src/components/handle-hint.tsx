import { Check } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";
import type { HandleCheck } from "@/src/hooks/use-handle-check";

/** The message a handle check earns. "Too short" waits until the person leaves the field. */
export function handleProblem(check: HandleCheck, left: boolean): string | null {
  if (check.status === "badChars") return "Use letters, numbers and underscores only";
  if (check.status === "short" && left) return "Use at least 3 characters";
  if (check.status === "taken") return "That handle is taken";
  return null;
}

/** Live feedback under a handle field: checking, available, or what is wrong. */
export function HandleHint({ check, handle }: { check: HandleCheck; handle: string }) {
  if (check.status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
        <Spinner className="size-3.5" /> Checking @{handle}
      </p>
    );
  }
  if (check.status === "free") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium" aria-live="polite">
        <Check aria-hidden className="size-4 text-success" strokeWidth={3} /> @{handle} is available
      </p>
    );
  }
  return null;
}
