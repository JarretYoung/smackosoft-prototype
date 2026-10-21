import { notFound, redirect } from "next/navigation";
import type { Result } from "@/src/contract";

/**
 * Unwraps a read in a Server Component. Missing and forbidden both render the 404 page,
 * a missing session goes to login, anything else is a bug and throws.
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  switch (result.error.code) {
    case "NOT_FOUND":
    case "FORBIDDEN":
      notFound();
    case "UNAUTHENTICATED":
      redirect("/auth/login");
    default:
      throw new Error(`${result.error.code}: ${JSON.stringify(result.error.issues ?? [])}`);
  }
}
