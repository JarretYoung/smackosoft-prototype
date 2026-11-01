"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { browserZone, offsetLabel, searchZones, zoneCity, zoneRegion } from "@/src/lib/zoned";

/**
 * Pick the zone a session happens in. It opens with the current zone and the browser's, which are
 * nearly always the answer, and finds any other by typing a city. Tapping one sets it and closes,
 * so there is nothing to confirm.
 */
export function ZoneSheet({
  open,
  onOpenChange,
  value,
  date,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  /** The session's day, so each offset is the one that applies then. */
  date: string;
  onChange: (zone: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="pb-0">
          <SheetTitle>Time zone</SheetTitle>
          <SheetDescription>The times of this session are on the clock of this zone, for everyone.</SheetDescription>
        </SheetHeader>
        {open && (
          <Picker
            value={value}
            date={date}
            onPick={(zone) => {
              onChange(zone);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Picker({ value, date, onPick }: { value: string; date: string; onPick: (zone: string) => void }) {
  const [query, setQuery] = useState("");
  const yours = browserZone();
  const searching = query.trim() !== "";
  const zones = searching ? searchZones(query) : [...new Set([value, yours].filter(Boolean))];

  return (
    <div className="flex flex-col gap-3 px-5 pb-6">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for a city"
        aria-label="Search for a city"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      {zones.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">No city matches that.</p>
      ) : (
        <ul className="group-list border border-border/60 shadow-none">
          {zones.map((zone) => (
            <li key={zone}>
              <button type="button" onClick={() => onPick(zone)} className="pressable-row list-row min-h-14 w-full text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{zoneCity(zone)}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[zone === yours && "Your time zone", zoneRegion(zone), offsetLabel(zone, date)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {zone === value && <Check className="size-5 shrink-0 text-primary" aria-label="Selected" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searching && <p className="px-1 text-sm text-muted-foreground">Type a city to use a different zone.</p>}
    </div>
  );
}
