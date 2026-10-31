"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/src/components/ui/button";

/**
 * The rest of a long list behind one button. The server renders the rest and sends it with the
 * page, so tapping the button fetches nothing. Until then only the button shows.
 */
export function ShowMore({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return children;
  return (
    <div className="flex justify-center">
      <Button type="button" variant="text" onClick={() => setOpen(true)}>
        {label}
      </Button>
    </div>
  );
}
