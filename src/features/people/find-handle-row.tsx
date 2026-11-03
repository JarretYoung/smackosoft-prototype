import { Search } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";

/**
 * The "Find @handle" row of a people picker. While it looks, the magnifier is a spinner. When nobody
 * can be used, the magnifier returns and the reason shows under the handle, in red.
 */
export function FindHandleRow({ handle, looking, error, onFind }: { handle: string; looking: boolean; error: string | null; onFind: () => void }) {
  return (
    <button
      type="button"
      onClick={onFind}
      disabled={looking}
      className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-100"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        {looking ? <Spinner /> : <Search aria-hidden className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-primary">Find @{handle}</span>
        {error && (
          <span role="alert" className="block text-sm font-medium text-destructive">
            {error}
          </span>
        )}
      </span>
    </button>
  );
}
