import { RowChevron } from "@/src/components/row-chevron";
import { cn } from "@/src/lib/utils";

/**
 * A setting as a row: the label on the left, the current value on the right, a chevron.
 * Tapping it opens the right picker. Put it in a `group-list` (inside an `li`).
 */
export function ValueRow({
  id,
  label,
  value,
  placeholder,
  invalid,
  onClick,
}: {
  id?: string;
  label: string;
  /** The current value as text. Empty shows the placeholder. */
  value: string | null;
  placeholder: string;
  invalid?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      // A button cannot carry aria-invalid, so the error reveal looks for this instead.
      data-field-invalid={invalid || undefined}
      className="pressable-row list-row min-h-14 w-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring data-[field-invalid]:ring-[3px] data-[field-invalid]:ring-inset data-[field-invalid]:ring-destructive/40"
    >
      <span className="text-body font-semibold tracking-tight">{label}</span>
      <span className={cn("ml-auto min-w-0 truncate text-body", value ? "text-foreground" : "text-muted-foreground")}>
        {value ?? placeholder}
      </span>
      <RowChevron />
    </button>
  );
}
