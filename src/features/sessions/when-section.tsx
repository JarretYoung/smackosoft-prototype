"use client";

import { useState } from "react";
import { FieldError } from "@/src/components/ui/field";
import { addDays, clock12, dayShort, durationLabel, weekdayDate } from "@/src/lib/format";
import { DateSheet } from "./date-sheet";
import { DAY, endSuggestions, endTape, START_TIMES } from "./session-times";
import { TimeSheet, timeChips } from "./time-sheet";
import type { SessionFormState } from "./use-session-form";
import { ValueRow } from "./value-row";

const START_CHIPS = timeChips(START_TIMES);

/** The date, start and end as rows. Each opens a sheet to pick from. */
export function WhenSection({ session }: { session: SessionFormState }) {
  const { form, errorOf, times } = session;
  const [pickDate, setPickDate] = useState(false);
  const [pickTime, setPickTime] = useState<"start" | "end" | null>(null);
  const runHint = times.runMinutes ? `${durationLabel(times.runMinutes)} long` : undefined;

  return (
    <form.Field name="date">
      {(dateField) => (
        <form.Field name="startTime">
          {(startField) => (
            <form.Field name="endTime">
              {(endField) => {
                const date = dateField.state.value;
                const start = startField.state.value;
                const end = endField.state.value;
                const tape = endTape(start);
                const nextDayLabel = dayShort(addDays(date, 1));
                return (
                  <section className="flex flex-col gap-2">
                    <h2 className="section-label">When</h2>
                    <ul className="group-list">
                      <li>
                        <ValueRow
                          id="date"
                          label="Date"
                          value={date ? weekdayDate(date) : null}
                          placeholder="Pick a date"
                          invalid={!!errorOf(dateField)}
                          onClick={() => setPickDate(true)}
                        />
                      </li>
                      <li>
                        <ValueRow
                          label="Starts"
                          value={start ? clock12(start) : null}
                          placeholder="Not set"
                          onClick={() => setPickTime("start")}
                        />
                      </li>
                      <li>
                        <ValueRow
                          id="endTime"
                          label="Ends"
                          value={end ? `${clock12(end)}${times.nextDay ? `, ${nextDayLabel}` : ""}` : null}
                          placeholder="Not set"
                          invalid={!!errorOf(endField)}
                          onClick={() => setPickTime("end")}
                        />
                      </li>
                    </ul>
                    <FieldError className="px-1">{errorOf(dateField) ?? errorOf(endField)}</FieldError>

                    <DateSheet open={pickDate} onOpenChange={setPickDate} value={date} onChange={dateField.handleChange} />
                    <TimeSheet
                      open={pickTime === "start"}
                      onOpenChange={(open) => !open && setPickTime(null)}
                      title="Starts"
                      value={start}
                      onChange={startField.handleChange}
                      quick={START_CHIPS}
                      restAt={19 * 60}
                      hint={runHint}
                      clearLabel="No start time"
                    />
                    <TimeSheet
                      open={pickTime === "end"}
                      onOpenChange={(open) => !open && setPickTime(null)}
                      title="Ends"
                      value={end}
                      onChange={endField.handleChange}
                      quick={timeChips(endSuggestions(start))}
                      restAt={tape.restAt}
                      min={tape.min}
                      max={tape.max}
                      marks={tape.spansNextDay ? [{ at: DAY, label: nextDayLabel }] : undefined}
                      nextDay={times.nextDay}
                      nextDayLabel={nextDayLabel}
                      hint={runHint}
                      clearLabel="No end time"
                    />
                  </section>
                );
              }}
            </form.Field>
          )}
        </form.Field>
      )}
    </form.Field>
  );
}
