import { revalidatePath } from "next/cache";
import type { Result } from "@/src/contract";

/** Runs a write, then refreshes every page on success so the next read is fresh. */
export async function refreshed<T>(write: Promise<Result<T>>): Promise<Result<T>> {
  const result = await write;
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
