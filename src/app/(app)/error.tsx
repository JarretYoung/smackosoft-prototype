"use client";

import { ErrorScreen } from "@/src/components/error-screen";

/** A page in the app failed. The tab bar stays, so the person can go elsewhere. */
export default function AppError({ reset }: { reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}
