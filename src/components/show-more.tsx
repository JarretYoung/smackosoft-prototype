"use client";

import { Children, useState, type ReactNode } from "react";
import { Button } from "@/src/components/ui/button";

/**
 * The first `initial` list items, then a button for the rest. The rows are rendered by the server
 * and only the cut is decided here, so the whole list is in the page and nothing is fetched on tap.
 * Put it inside a `ul`.
 */
export function ShowMore({ initial, label, children }: { initial: number; label: string; children: ReactNode }) {
  const [all, setAll] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - initial;
  return (
    <>
      {all ? items : items.slice(0, initial)}
      {!all && hidden > 0 && (
        <li className="flex justify-center py-1">
          <Button type="button" variant="text" onClick={() => setAll(true)}>
            {label} ({hidden} more)
          </Button>
        </li>
      )}
    </>
  );
}
