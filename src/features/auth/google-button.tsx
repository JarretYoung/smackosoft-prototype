"use client";

import { signInWithGoogle } from "@/src/features/auth/actions";
import { GoogleMark } from "@/src/components/google-mark";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { errorMessage } from "@/src/lib/errors";
import { useState, useTransition } from "react";

/** Starts the Google sign in. Sign in and sign up are the same thing here. */
export function GoogleButton() {
  const [isLoading, begin] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setError(null);
    begin(async () => {
      // On success the action redirects to Google, so a result only ever comes back as a failure.
      const result = await signInWithGoogle();
      if (!result.ok) setError(errorMessage(result.error));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-footnote text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" size="lg" disabled={isLoading} onClick={start}>
        {isLoading ? <Spinner /> : <GoogleMark />}
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
