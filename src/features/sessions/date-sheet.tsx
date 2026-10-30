"use client";

import { Calendar } from "@/src/components/ui/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";

const toDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/** Pick the day on a calendar. Tapping a day sets it and closes the sheet, so there is nothing to confirm. */
export function DateSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (date: string) => void;
}) {
  const selected = value ? toDate(value) : undefined;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Without this the sheet focuses the previous month arrow and draws a ring on it. */}
      <SheetContent side="bottom" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="pb-0">
          <SheetTitle>Date</SheetTitle>
          <SheetDescription className="sr-only">Pick the day of the session</SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-6">
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(day.toLocaleDateString("en-CA"));
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
