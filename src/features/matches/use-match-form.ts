"use client";

import { useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  removeGames,
  removeGameScores,
  removeMatchPlayers,
  saveGames,
  saveGameScores,
  saveMatches,
  saveMatchPlayers,
  saveTeams,
} from "@/src/features/matches/actions";
import {
  advancesAfterScore,
  gamesReducer,
  isDirty,
  matchSchema,
  planMatchSave,
  toValues,
  winnerOf,
  type GameDraft,
  type GamesAction,
  type MatchValues,
} from "@/src/features/matches/match-draft";
import { ok, type Match, type Result } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { useAppForm } from "@/src/hooks/use-app-form";

/**
 * Form state for one match. Everything is staged here and Save sends the changes in dependency
 * order. Every call is replay safe, so if one fails you can press save again.
 */
export function useMatchForm({ sessionId, match }: { sessionId: string; match: Match }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toValues(match));
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [openTimes, setOpenTimes] = useState<Set<string>>(new Set());

  const app = useAppForm({
    defaultValues: saved,
    schema: matchSchema,
    unsaved: isDirty,
    submit: async (values): Promise<Result<null>> => {
      const plan = planMatchSave(match, sessionId, values);

      const saveMatch = await saveMatches([plan.match]);
      if (!saveMatch.ok) return saveMatch;
      const teams = await saveTeams(plan.teams);
      if (!teams.ok) return teams;

      if (plan.removedPlayers.length) {
        const result = await removeMatchPlayers(plan.removedPlayers);
        if (!result.ok) return result;
      }
      if (plan.addedPlayers.length) {
        const result = await saveMatchPlayers(plan.addedPlayers);
        if (!result.ok) return result;
      }

      if (plan.removedGameIds.length) {
        const result = await removeGames(plan.removedGameIds);
        if (!result.ok) return result;
      }
      if (plan.games.length) {
        const result = await saveGames(plan.games);
        if (!result.ok) return result;
      }

      if (plan.clearedScores.length) {
        const result = await removeGameScores(plan.clearedScores);
        if (!result.ok) return result;
      }
      if (plan.scores.length) {
        const result = await saveGameScores(plan.scores);
        if (!result.ok) return result;
      }
      return ok(null);
    },
    onSuccess: (_data, { values, reset }) => {
      // The saved values are the new baseline, so leaving the page does not ask about discarding.
      setSaved(values);
      reset(values);
      toast.success("Match saved");
      router.replace(`/sessions/${sessionId}/matches/${match.id}`);
    },
    serverFields: [],
    unmatched: (error) => toast.error(errorMessage(error)),
  });

  const values: MatchValues = useStore(app.form.store, (state) => state.values);
  const changeGames = (action: GamesAction) => app.form.setFieldValue("games", (list) => gamesReducer(list, action));

  function setScore(gameId: string, teamId: string, value: string, input: HTMLInputElement) {
    const before = values.games.find((g) => g.id === gameId)?.scores[teamId] ?? "";
    changeGames({ type: "score", gameId, teamId, value });
    if (!advancesAfterScore(before, value)) return;
    const boxes = [...document.querySelectorAll<HTMLInputElement>("input[data-score]")];
    boxes[boxes.indexOf(input) + 1]?.focus();
  }

  function removeGame(game: GameDraft, index: number) {
    changeGames({ type: "remove", id: game.id });
    toast(`Game ${index + 1} removed`, {
      action: { label: "Undo", onClick: () => changeGames({ type: "restore", game, index }) },
    });
  }

  return {
    ...app,
    values,
    saveDisabled: app.pending || !app.dirty,
    editingTeam: values.teams.find((t) => t.id === editingTeam),
    editTeam: setEditingTeam,
    openTimes,
    showTimes: (gameId: string) => setOpenTimes((s) => new Set(s).add(gameId)),
    winnerOf: (game: GameDraft) => winnerOf(game, values.teams),
    setScore,
    removeGame,
    setGameTime: (gameId: string, field: "startTime" | "endTime", time: string) =>
      changeGames({ type: "time", gameId, field, time }),
    addGame: () =>
      changeGames({
        type: "add",
        id: crypto.randomUUID(),
        now: new Date(),
        savedNumbers: match.games.map((g) => g.gameNumber),
      }),
    setTeamPlayers: (teamId: string, playerIds: string[]) =>
      app.form.setFieldValue("teams", (list) => list.map((t) => (t.id === teamId ? { ...t, playerIds } : t))),
    save: () => void app.form.handleSubmit(),
  };
}
