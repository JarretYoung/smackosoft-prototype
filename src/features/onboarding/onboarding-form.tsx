"use client";

import { useState } from "react";
import { HandleHint } from "@/src/components/handle-hint";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Separator } from "@/src/components/ui/separator";
import { Spinner } from "@/src/components/ui/spinner";
import { useClaimForm, useOnboardingForm } from "@/src/features/onboarding/use-onboarding-form";

export function OnboardingForm({
  claimCode,
  suggestedName,
  avatarUrl,
}: {
  claimCode: string;
  suggestedName: string;
  /** The picture from the sign in provider, saved with the new account. */
  avatarUrl: string | null;
}) {
  const [claiming, setClaiming] = useState(claimCode !== "");
  const profile = useOnboardingForm({ suggestedName, avatarUrl });
  const claim = useClaimForm(claimCode);

  const claimForm = (
    <form {...claim.formProps} className="flex flex-col gap-4">
      <FieldGroup>
        <claim.form.Field name="code">
          {(field) => (
            <Field data-invalid={!!claim.errorOf(field)}>
              <FieldLabel htmlFor="claim">Claim code</FieldLabel>
              <Input
                {...claim.inputProps(field)}
                id="claim"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder="Code from the person who added you"
              />
              <FieldDescription>
                If someone added you as a guest, their code makes that guest your account, with its match history.
              </FieldDescription>
              <FieldError>{claim.errorOf(field)}</FieldError>
            </Field>
          )}
        </claim.form.Field>
      </FieldGroup>
      <Button type="submit" variant={claimCode ? "default" : "secondary"} size="lg" disabled={claim.pending || !claim.canClaim}>
        {claim.pending && <Spinner />}
        {claim.pending ? "Claiming" : "Claim my guest account"}
      </Button>
    </form>
  );

  const profileForm = (
    <form {...profile.formProps} className="flex flex-col gap-6">
      <FieldGroup>
        <profile.form.Field name="displayName">
          {(field) => (
            <Field data-invalid={!!profile.errorOf(field)}>
              <FieldLabel htmlFor="displayName">Display name</FieldLabel>
              <Input
                {...profile.inputProps(field)}
                id="displayName"
                placeholder="Your name"
                autoComplete="name"
                enterKeyHint="next"
              />
              <FieldError>{profile.errorOf(field)}</FieldError>
            </Field>
          )}
        </profile.form.Field>
        <profile.form.Field name="handle">
          {(field) => {
            const error = profile.handleError(field);
            return (
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="handle">Handle</FieldLabel>
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg font-semibold text-muted-foreground">
                    @
                  </span>
                  <Input
                    {...profile.inputProps(field)}
                    aria-invalid={!!error}
                    id="handle"
                    placeholder="yourhandle"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
                    enterKeyHint="go"
                  />
                </div>
                {error ? <FieldError>{error}</FieldError> : <HandleHint check={profile.check} handle={profile.handle} />}
                <FieldDescription>Friends find you by this. You can change it 2 more times later.</FieldDescription>
              </Field>
            );
          }}
        </profile.form.Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={profile.pending}>
        {profile.pending && <Spinner />}
        {profile.pending ? "Saving" : "Continue"}
      </Button>
    </form>
  );

  // Someone who arrives with a code came to claim a guest, so that comes first.
  if (claimCode) {
    return (
      <div className="flex flex-col gap-6">
        {claimForm}
        <Separator />
        <div className="flex flex-col gap-4">
          <p className="text-center text-subhead text-muted-foreground">Or start a new account instead</p>
          {profileForm}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {profileForm}
      <Separator />
      {claiming ? (
        claimForm
      ) : (
        <Button type="button" variant="link" onClick={() => setClaiming(true)} className="self-center">
          I have a claim code
        </Button>
      )}
    </div>
  );
}
