import { Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * "Add something" as the last row of a list, so the tappable surface is white like the rows above it.
 * Put it in a `group-list` (inside an `li` when the list is a `ul`).
 */
export function AddRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("pressable-row flex min-h-14 w-full items-center gap-3 px-4 text-left font-semibold text-primary", className)}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
        <Plus className="size-5" strokeWidth={2.5} />
      </span>
      {children}
    </button>
  );
}
