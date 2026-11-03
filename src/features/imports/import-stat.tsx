import type { LucideIcon } from "lucide-react";

/** One row about what the files hold: a tinted icon, what it counts, and the number. */
export function ImportStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <li className="list-row">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Icon aria-hidden className="size-4" strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1 text-body">{label}</span>
      <span className="score text-xl">{value}</span>
    </li>
  );
}
