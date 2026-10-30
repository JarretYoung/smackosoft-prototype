"use client";

import { Crown, Minus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  removeGames,
  removeMatchPlayers,
  saveGames,
  saveMatches,
  saveMatchPlayers,
  removeGameScores,
  saveGameScores,
  saveTeams,
} from "@/src/app/actions";
import { AvatarStack } from "@/src/components/avatar-stack";
import { LocalTimeRange } from "@/src/components/local-time";
import { AddRow } from "@/src/components/add-row";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { MatchType, type Account, type Match } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { isoToTimeInput, timeInputToIso } from "@/src/lib/format";
import { MATCH_TYPE_LABEL } from "@/src/lib/match-type";
import { useUnsavedChanges } from "@/src/lib/unsaved-changes";
import { cn } from "@/src/lib/utils";
import { TeamPlayersSheet } from "./team-players-sheet";

type TeamState = { id: string; label: string; playerIds: Set<string> };
type GameState = {
  id: string;
  gameNumber: number;
  startTime: string;
  endTime: string;
  /** Score text per team id. Blank means not entered. */
  scores: Record<string, string>;
};

const MATCH_TYPES = MatchType.options;

/** A new game is assumed to last this long. The times are editable on each game. */
const DEFAULT_GAME_MINUTES = 20;

function initialGames(match: Match): GameState[] {
  return match.games.map((game) => ({
    id: game.id,
    gameNumber: game.gameNumber,
    startTime: game.startTime,
    endTime: game.endTime,
    scores: Object.fromEntries(game.scores.map((s) => [s.matchTeamId, String(s.score)])),
  }));
}

/**
 * Edit one match: label and type, who plays for each team, and the games with their scores.
 * Everything is staged here. "Save all" sends the changes in dependency order.
 * Every call is replay safe, so if one fails you can press save again.
 */
export function MatchEditor({
  sessionId,
  match,
  members,
}: {
  sessionId: string;
  match: Match;
  members: Account[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState(match.label);
  const [matchType, setMatchType] = useState(match.matchType);
  const [teams, setTeams] = useState<TeamState[]>(
    match.teams.map((t) => ({ id: t.id, label: t.label, playerIds: new Set(t.players.map((p) => p.id)) })),
  );
  const [games, setGames] = useState<GameState[]>(initialGames(match));
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [openTimes, setOpenTimes] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  // Dirty means "differs from what was last saved". Compared as text so any edit counts.
  const snapshot = JSON.stringify([
    label,
    matchType,
    teams.map((t) => [t.id, [...t.playerIds].sort()]),
    games.map((g) => [g.id, g.startTime, g.endTime, teams.map((t) => g.scores[t.id] ?? "")]),
  ]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  useUnsavedChanges(dirty && !pending);

  const byId = new Map(members.map((m) => [m.id, m]));
  const playersOf = (team: TeamState) => [...team.playerIds].flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));

  function setScore(gameId: string, teamId: string, value: string, input: HTMLInputElement) {
    if (!/^\d{0,3}$/.test(value)) return;
    const before = games.find((g) => g.id === gameId)?.scores[teamId] ?? "";
    const typingForward = value.length === 2 && before.length < 2;
    setGames((list) =>
      list.map((g) => (g.id === gameId ? { ...g, scores: { ...g.scores, [teamId]: value } } : g)),
    );
    // Two digits is a full badminton score, so move on to the next score box.
    if (typingForward) {
      const boxes = [...document.querySelectorAll<HTMLInputElement>("input[data-score]")];
      boxes[boxes.indexOf(input) + 1]?.focus();
    }
  }

  function removeGame(game: GameState, index: number) {
    setGames((list) => list.filter((g) => g.id !== game.id));
    toast(`Game ${index + 1} removed`, {
      action: {
        label: "Undo",
        onClick: () =>
          setGames((list) => (list.some((g) => g.id === game.id) ? list : [...list.slice(0, index), game, ...list.slice(index)])),
      },
    });
  }

  function setGameTime(gameId: string, field: "startTime" | "endTime", time: string) {
    if (!time) return;
    setGames((list) => list.map((g) => (g.id === gameId ? { ...g, [field]: timeInputToIso(g[field], time) } : g)));
  }

  function addGame() {
    setGames((list) => {
      // The next game starts when the last one ended, or now for the first.
      const start = list.length ? new Date(list[list.length - 1].endTime) : new Date();
      return [...list, newGame(list, start)];
    });
  }

  function newGame(list: GameState[], start: Date): GameState {
    return {
      id: crypto.randomUUID(),
      // Numbers are never reused, so a removed game leaves a gap nobody sees.
      gameNumber: Math.max(0, ...list.map((g) => g.gameNumber), ...match.games.map((g) => g.gameNumber)) + 1,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + DEFAULT_GAME_MINUTES * 60_000).toISOString(),
      scores: {},
    };
  }

  function winnerOf(game: GameState): string | null {
    const entered = teams
      .map((t) => ({ id: t.id, score: game.scores[t.id] }))
      .filter((s) => s.score !== undefined && s.score !== "")
      .map((s) => ({ id: s.id, score: Number(s.score) }));
    if (entered.length < 2) return null;
    const top = Math.max(...entered.map((s) => s.score));
    const leaders = entered.filter((s) => s.score === top);
    return leaders.length === 1 ? leaders[0].id : null;
  }

  function saveAll() {
    start(async () => {
      const fail = (error: Parameters<typeof errorMessage>[0]) => void toast.error(errorMessage(error));

      const matchResult = await saveMatches([{ id: match.id, sessionId, label: label.trim() || match.label, matchType }]);
      if (!matchResult.ok) return fail(matchResult.error);

      const teamsResult = await saveTeams(teams.map((t) => ({ id: t.id, matchId: match.id, label: t.label })));
      if (!teamsResult.ok) return fail(teamsResult.error);

      // Players. Removals go first so someone can move between teams in one save.
      const before = new Set(match.teams.flatMap((t) => t.players.map((p) => `${t.id}:${p.id}`)));
      const after = teams.flatMap((t) => [...t.playerIds].map((id) => ({ matchTeamId: t.id, accountId: id })));
      const afterKeys = new Set(after.map((p) => `${p.matchTeamId}:${p.accountId}`));
      const removedPlayers = [...before]
        .filter((key) => !afterKeys.has(key))
        .map((key) => ({ matchTeamId: key.split(":")[0], accountId: key.split(":")[1] }));
      const addedPlayers = after.filter((p) => !before.has(`${p.matchTeamId}:${p.accountId}`));
      if (removedPlayers.length) {
        const result = await removeMatchPlayers(removedPlayers);
        if (!result.ok) return fail(result.error);
      }
      if (addedPlayers.length) {
        const result = await saveMatchPlayers(addedPlayers);
        if (!result.ok) return fail(result.error);
      }

      // Games. Removals first, then the rest.
      const keptIds = new Set(games.map((g) => g.id));
      const removedGames = match.games.filter((g) => !keptIds.has(g.id)).map((g) => g.id);
      if (removedGames.length) {
        const result = await removeGames(removedGames);
        if (!result.ok) return fail(result.error);
      }
      if (games.length) {
        const result = await saveGames(
          games.map((g) => ({
            id: g.id,
            matchId: match.id,
            gameNumber: g.gameNumber,
            startTime: g.startTime,
            endTime: g.endTime,
          })),
        );
        if (!result.ok) return fail(result.error);
      }

      // Scores. A blank box over a saved score clears it.
      const cleared = match.games.flatMap((saved) => {
        const game = games.find((g) => g.id === saved.id);
        if (!game) return []; // The game was removed, and its scores went with it.
        return saved.scores
          .filter((s) => (game.scores[s.matchTeamId] ?? "") === "")
          .map((s) => ({ matchTeamId: s.matchTeamId, matchGameId: saved.id }));
      });
      if (cleared.length) {
        const result = await removeGameScores(cleared);
        if (!result.ok) return fail(result.error);
      }
      const scores = games.flatMap((g) =>
        teams.flatMap((t) => {
          const text = g.scores[t.id];
          return text === undefined || text === "" ? [] : [{ matchTeamId: t.id, matchGameId: g.id, score: Number(text) }];
        }),
      );
      if (scores.length) {
        const result = await saveGameScores(scores);
        if (!result.ok) return fail(result.error);
      }

      setBaseline(snapshot);
      toast.success("Match saved");
      router.replace(`/sessions/${sessionId}/matches/${match.id}`);
    });
  }

  const editing = teams.find((t) => t.id === editingTeam);
  const otherTeams = teams.filter((t) => t.id !== editingTeam);

  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="match-label">Name</FieldLabel>
            <Input id="match-label" value={label} autoComplete="off" onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="match-type">Type</FieldLabel>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as typeof matchType)}>
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
        </FieldGroup>
      </section>

      <section aria-labelledby="teams-heading" className="flex flex-col gap-2">
        <h2 id="teams-heading" className="section-label">
          Teams
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setEditingTeam(team.id)}
              className="pressable flex flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card"
              aria-label={`Edit ${team.label} players`}
            >
              <span className="flex w-full items-center justify-between text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
                {team.label}
                <Pencil className="size-3.5" />
              </span>
              {team.playerIds.size > 0 ? (
                <AvatarStack people={playersOf(team)} max={3} />
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
        {games.map((game, index) => {
          const winner = winnerOf(game);
          return (
            <div key={game.id} className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold tracking-tight">Game {index + 1}</h3>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label={`Remove game ${index + 1}`}
                  onClick={() => removeGame(game, index)}
                >
                  <Minus />
                </Button>
              </div>
              {openTimes.has(game.id) ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Input
                    type="time"
                    aria-label={`Start time for game ${index + 1}`}
                    value={isoToTimeInput(game.startTime)}
                    onChange={(e) => setGameTime(game.id, "startTime", e.target.value)}
                  />
                  to
                  <Input
                    type="time"
                    aria-label={`End time for game ${index + 1}`}
                    value={isoToTimeInput(game.endTime)}
                    onChange={(e) => setGameTime(game.id, "endTime", e.target.value)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`Edit times for game ${index + 1}`}
                  onClick={() => setOpenTimes((s) => new Set(s).add(game.id))}
                  className="pressable -mt-2 flex min-h-11 items-center justify-between gap-2 rounded-xl text-left text-sm text-muted-foreground"
                >
                  <span>
                    <LocalTimeRange start={game.startTime} end={game.endTime} />
                    {" · "}
                    {Math.max(0, Math.round((Date.parse(game.endTime) - Date.parse(game.startTime)) / 60_000))} min
                  </span>
                  <span className="font-semibold text-primary">Edit</span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                {teams.map((team) => {
                  return (
                    <div key={team.id} className="flex flex-col gap-1.5">
                      <div
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl p-3 transition-colors",
                          winner === team.id ? "bg-accent" : "bg-muted",
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          <span className="truncate">{team.label}</span>
                          {winner === team.id && <Crown aria-label="Winner" className="size-4 shrink-0 fill-gold text-gold" />}
                        </span>
                        <Input
                          data-score
                          inputMode="numeric"
                          enterKeyHint="next"
                          autoComplete="off"
                          aria-label={`${team.label} score for game ${index + 1}`}
                          placeholder="0"
                          className="score h-14 rounded-lg bg-card text-center text-3xl"
                          value={game.scores[team.id] ?? ""}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => setScore(game.id, team.id, e.target.value, e.currentTarget)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="group-list rounded-2xl">
          <AddRow onClick={addGame}>Add game</AddRow>
        </div>
      </section>

      {/* Stays in reach however many games there are. */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4">
        <Button type="button" size="lg" className="w-full" disabled={pending || !dirty} onClick={saveAll}>
          {pending && <Spinner />}
          {pending ? "Saving" : "Save match"}
        </Button>
      </div>

      <TeamPlayersSheet
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        teamLabel={editing?.label ?? ""}
        candidates={members}
        selected={editing?.playerIds ?? new Set()}
        takenElsewhere={new Set(otherTeams.flatMap((t) => [...t.playerIds]))}
        onChange={(ids) =>
          setTeams((list) => list.map((t) => (t.id === editingTeam ? { ...t, playerIds: ids } : t)))
        }
      />
    </div>
  );
}
