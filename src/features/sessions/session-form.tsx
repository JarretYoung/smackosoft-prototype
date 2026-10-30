"use client";

import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/src/components/ui/field";
import { Spinner } from "@/src/components/ui/spinner";
import type { Account, Role } from "@/src/contract";
import { useHydrated } from "@/src/hooks/use-hydrated";
import { longDate } from "@/src/lib/format";
import { CoverTile } from "./cover-tile";
import { MembersSection } from "./members-section";
import type { SessionFormInitial } from "./session-values";
import { useSessionForm } from "./use-session-form";
import { FeeSection, WhereSection } from "./where-section";
import { WhenSection } from "./when-section";

type Props = {
  mode: "create" | "edit";
  initial: SessionFormInitial;
  viewerRole: Role;
  /** Suggestions for the member picker. */
  people: Account[];
  /** The date of the session the defaults came from, so the form can say where they are from. */
  prefilledFrom?: string;
};

/**
 * Create or edit a session and its members. The times are the browser's local time, which the
 * server cannot know, so the form starts empty-timed on the server and is created again once the
 * browser has taken over.
 */
export function SessionForm(props: Props) {
  const zoned = useHydrated();
  return <SessionFormBody key={zoned ? "browser" : "server"} {...props} zoned={zoned} />;
}

function SessionFormBody({ mode, initial, viewerRole, people, prefilledFrom, zoned }: Props & { zoned: boolean }) {
  const session = useSessionForm({ mode, initial, viewerRole, zoned });
  const { form, formProps, errorOf, inputProps, busy, saveDisabled } = session;

  return (
    <form {...formProps} className="flex flex-col gap-6 px-4 pt-4 pb-4">
      {mode === "create" && prefilledFrom && (
        <p className="px-1 text-sm text-muted-foreground">
          Location, time and fee come from your session on {longDate(prefilledFrom)}. Change anything.
        </p>
      )}
      <form.Field name="coverUrl">
        {(field) => (
          <CoverTile url={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} error={errorOf(field)} />
        )}
      </form.Field>

      <form.Field name="label">
        {(field) => (
          <Field
            data-invalid={!!errorOf(field)}
            className="gap-1 rounded-2xl bg-card px-4 pt-3 pb-4 shadow-card transition-shadow focus-within:ring-[3px] focus-within:ring-ring"
          >
            <FieldLabel htmlFor="label" className="section-label px-0">
              Name
            </FieldLabel>
            <input
              {...inputProps(field)}
              id="label"
              placeholder="Badminton with da Laddies"
              enterKeyHint="next"
              className="w-full min-w-0 bg-transparent text-xl font-bold tracking-tight text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50"
            />
            <FieldError>{errorOf(field)}</FieldError>
          </Field>
        )}
      </form.Field>

      <WhenSection session={session} />
      <WhereSection session={session} />
      <FeeSection session={session} />
      <MembersSection session={session} people={people} />

      <div className="glass-bar sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="w-full" disabled={saveDisabled}>
          {busy && <Spinner />}
          {busy ? "Saving" : mode === "create" ? "Create session" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
