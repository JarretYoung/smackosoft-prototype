"use client";

import { ErrorScreen } from "@/src/components/error-screen";

/** Anything the app section's own boundary does not catch, such as its layout or the auth screens. */
export default function RootError({ reset }: { reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}
