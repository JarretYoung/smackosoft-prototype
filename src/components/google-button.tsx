"use client";

import { createClient } from "@/src/lib/supabase/client";
import { GoogleMark } from "@/src/components/google-mark";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { authMessage } from "@/src/lib/auth-errors";
import { useState } from "react";

/** Starts the Google sign in. Sign in and sign up are the same thing here. */
export function GoogleButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser leaves for Google, so the spinner stays.
    if (error) {
      setError(authMessage(error));
      setIsLoading(false);
    }
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
