import type { ReactNode } from "react";

export function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary [&_svg]:size-[1.125rem]">
      {children}
    </span>
  );
}

export function FactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="list-row">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-body">{children}</p>
      </div>
    </div>
  );
}
