import { z } from "zod";

/** Name and handle as typed in the onboarding and profile forms. The handle's format is checked live against the server. */
export const accountSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name"),
  handle: z.string().refine((value) => value.trim().replace(/^@/, "") !== "", "Choose a handle"),
});
