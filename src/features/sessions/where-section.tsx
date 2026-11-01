"use client";

import { MapPin } from "lucide-react";
import { OptionalTag } from "@/src/components/optional-tag";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { coordinatesShort } from "@/src/lib/format";
import { CourtFeeField } from "./court-fee-field";
import type { SessionFormState } from "./use-session-form";

/** A titled group of fields on one white surface. */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-label">{title}</h2>
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>{children}</FieldGroup>
      </div>
    </section>
  );
}

/** The location and its maps link. A pasted link can suggest the place name and pins the coordinates. */
export function WhereSection({ session }: { session: SessionFormState }) {
  const { form, errorOf, inputProps, place } = session;
  const { mapsLink, mapsName, lookingUp, pin } = place;

  return (
    <FormSection title="Where">
      <form.Field name="location">
        {(field) => (
          <Field data-invalid={!!errorOf(field)}>
            <FieldLabel htmlFor="location">
              Location <OptionalTag />
            </FieldLabel>
            <Input {...inputProps(field)} id="location" placeholder="Sunway Serene" />
            <FieldError>{errorOf(field)}</FieldError>
          </Field>
        )}
      </form.Field>
      <form.Field name="locationUrl">
        {(field) => (
          <Field data-invalid={!!errorOf(field)}>
            <FieldLabel htmlFor="maps">
              Maps link <OptionalTag />
            </FieldLabel>
            <Input
              {...inputProps(field)}
              id="maps"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://maps.app.goo.gl/..."
            />
            <FieldError>{errorOf(field)}</FieldError>
            {mapsName && (
              <Button
                type="button"
                variant="tinted"
                size="sm"
                className="h-auto min-h-9 self-start py-1.5 text-left whitespace-normal"
                onClick={() => form.setFieldValue("location", mapsName)}
              >
                Use “{mapsName}” as the location
              </Button>
            )}
            {lookingUp && <p className="text-sm text-muted-foreground">Looking up the place</p>}
            {pin && !lookingUp && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin aria-hidden className="size-4 text-primary" />
                <span className="tabular-nums">{coordinatesShort(pin.latitude, pin.longitude)}</span>
              </p>
            )}
            {mapsLink && !mapsLink.isMaps && !errorOf(field) && (
              <p className="text-sm text-muted-foreground">This does not look like a maps link. It will still be saved.</p>
            )}
          </Field>
        )}
      </form.Field>
    </FormSection>
  );
}

/** The optional court fee: an amount, its currency and common amounts to tap. */
export function FeeSection({ session }: { session: SessionFormState }) {
  const { form, errorOf } = session;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-label">
        Court fee{" "}
        <span className="tracking-normal normal-case">
          <OptionalTag />
        </span>
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <form.Field name="courtFee">
          {(fee) => (
            <form.Field name="currency">
              {(currency) => (
                <Field data-invalid={!!(errorOf(fee) || errorOf(currency))}>
                  <CourtFeeField
                    id="fee"
                    amount={fee.state.value}
                    currency={currency.state.value}
                    onAmount={fee.handleChange}
                    onCurrency={currency.handleChange}
                    onBlur={fee.handleBlur}
                    invalid={!!errorOf(fee)}
                  />
                  <FieldError>{errorOf(fee) ?? errorOf(currency)}</FieldError>
                </Field>
              )}
            </form.Field>
          )}
        </form.Field>
      </div>
    </section>
  );
}
