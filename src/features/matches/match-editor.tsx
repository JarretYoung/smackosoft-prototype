"use client";

import { Pencil } from "lucide-react";
import { AvatarStack } from "@/src/components/avatar-stack";
import { AddRow } from "@/src/components/add-row";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { MatchType, type Account, type Match } from "@/src/contract";
import { GameCard } from "@/src/features/matches/game-card";
import { MATCH_TYPE_LABEL } from "@/src/features/matches/match-type";
import { useMatchForm } from "@/src/features/matches/use-match-form";
import { TeamPlayersSheet } from "./team-players-sheet";

const MATCH_TYPES = MatchType.options;

/** Edit one match: label and type, who plays for each team, and the games with their scores. */
export function MatchEditor({
  sessionId,
  match,
  members,
}: {
  sessionId: string;
  match: Match;
  members: Account[];
}) {
  const state = useMatchForm({ sessionId, match });
  const { form, values, editingTeam } = state;

  const byId = new Map(members.map((m) => [m.id, m]));
  const playersOf = (playerIds: string[]) => playerIds.flatMap((id) => byId.get(id) ?? []);
  const otherTeams = values.teams.filter((t) => t.id !== editingTeam?.id);

  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>
          <form.Field name="label">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="match-label">Name</FieldLabel>
                <Input id="match-label" {...state.inputProps(field)} autoComplete="off" />
              </Field>
            )}
          </form.Field>
          <form.Field name="matchType">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="match-type">Type</FieldLabel>
                <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as typeof field.state.value)}>
                  <SelectTrigger id="match-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {MATCH_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </section>

      <section aria-labelledby="teams-heading" className="flex flex-col gap-2">
        <h2 id="teams-heading" className="section-label">
          Teams
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {values.teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => state.editTeam(team.id)}
              className="pressable flex flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card"
              aria-label={`Edit ${team.label} players`}
            >
              <span className="flex w-full items-center justify-between text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
                {team.label}
                <Pencil className="size-3.5" />
              </span>
              {team.playerIds.length > 0 ? (
                <AvatarStack people={playersOf(team.playerIds)} max={3} />
              ) : (
                <span className="flex h-9 items-center text-sm font-semibold text-primary">Choose players</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="games-heading" className="flex flex-col gap-3">
        <h2 id="games-heading" className="section-label">
          Games
        </h2>
        {values.games.map((game, index) => (
          <GameCard
            key={game.id}
            game={game}
            index={index}
            teams={values.teams}
            winner={state.winnerOf(game)}            timesOpen={state.openTimes.has(game.id)}
            onShowTimes={() => state.showTimes(game.id)}
            onTime={(field, time) => state.setGameTime(game.id, field, time)}
            onScore={(teamId, value, input) => state.setScore(game.id, teamId, value, input)}
            onRemove={() => state.removeGame(game, index)}
          />
        ))}
        <div className="group-list rounded-2xl">
          <AddRow onClick={state.addGame}>Add game</AddRow>
        </div>
      </section>

      {/* Stays in reach however many games there are. */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4">
        <Button type="button" size="lg" className="w-full" disabled={state.saveDisabled} onClick={state.save}>
          {state.pending && <Spinner />}
          {state.pending ? "Saving" : "Save match"}
        </Button>
      </div>

      <TeamPlayersSheet
        open={editingTeam !== undefined}
        teamId={editingTeam?.id ?? ""}
        teamLabel={editingTeam?.label ?? ""}
        candidates={members}
        playerIds={editingTeam?.playerIds ?? []}
        takenElsewhere={new Set(otherTeams.flatMap((t) => t.playerIds))}
        onClose={() => state.editTeam(null)}
        onSave={(ids) => {
          if (editingTeam) state.setTeamPlayers(editingTeam.id, ids);
          state.editTeam(null);
        }}
      />
    </div>
  );
}
