"use client";

import { z } from "zod";
import { useAppForm } from "@/src/hooks/use-app-form";

const teamPlayersSchema = z.object({ playerIds: z.array(z.string()) });

/**
 * The players of one team, edited as a draft. Done hands them to the match editor, which stages
 * them with the rest of the match. Closing without Done leaves the match as it was.
 */
export function useTeamPlayersForm({ playerIds, onSave }: { playerIds: string[]; onSave: (playerIds: string[]) => void }) {
  return useAppForm({
    defaultValues: { playerIds },
    schema: teamPlayersSchema,
    submit: (values) => onSave(values.playerIds),
  });
}
