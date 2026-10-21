"use client";

import { Crown, Minus, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  removeGames,
  removePlayers,
  saveGames,
  saveMatches,
  savePlayers,
  saveScores,
  saveTeams,
} from "@/src/app/actions";
import { AvatarStack } from "@/src/components/avatar-stack";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { MatchType, type Account, type Match } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
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

function initialGames(match: Match): GameState[] {
  return match.games.map((game) => ({
    id: game.id,
    gameNumber: game.gameNumber,
    startTime: game.startTime,
    endTime: game.endTime,
    scores: Object.fromEntries(game.scores.map((s) => [s.teamId, String(s.score)])),
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
  const [pending, start] = useTransition();

  const byId = new Map(members.map((m) => [m.id, m]));
  const playersOf = (team: TeamState) => [...team.playerIds].flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));

  function setScore(gameId: string, teamId: string, value: string) {
    if (!/^\d{0,3}$/.test(value)) return;
    setGames((list) =>
      list.map((g) => (g.id === gameId ? { ...g, scores: { ...g.scores, [teamId]: value } } : g)),
    );
  }

  function addGame() {
    const start = new Date();
    setGames((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        // Numbers are never reused, so a removed game leaves a gap nobody sees.
        gameNumber: Math.max(0, ...list.map((g) => g.gameNumber), ...match.games.map((g) => g.gameNumber)) + 1,
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 20 * 60_000).toISOString(),
        scores: {},
      },
    ]);
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
      const after = teams.flatMap((t) => [...t.playerIds].map((id) => ({ teamId: t.id, accountId: id })));
      const afterKeys = new Set(after.map((p) => `${p.teamId}:${p.accountId}`));
      const removedPlayers = [...before]
        .filter((key) => !afterKeys.has(key))
        .map((key) => ({ teamId: key.split(":")[0], accountId: key.split(":")[1] }));
      const addedPlayers = after.filter((p) => !before.has(`${p.teamId}:${p.accountId}`));
      if (removedPlayers.length) {
        const result = await removePlayers(removedPlayers);
        if (!result.ok) return fail(result.error);
      }
      if (addedPlayers.length) {
        const result = await savePlayers(addedPlayers);
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

      // Scores. A blank box is left as it is: a saved score cannot be cleared.
      const scores = games.flatMap((g) =>
        teams.flatMap((t) => {
          const text = g.scores[t.id];
          return text === undefined || text === "" ? [] : [{ teamId: t.id, gameId: g.id, score: Number(text) }];
        }),
      );
      if (scores.length) {
        const result = await saveScores(scores);
        if (!result.ok) return fail(result.error);
      }

      toast.success("Match saved");
      router.replace(`/sessions/${sessionId}/matches/${match.id}`);
    });
  }

  const editing = teams.find((t) => t.id === editingTeam);
  const otherTeams = teams.filter((t) => t.id !== editingTeam);

  return (
    <div className="space-y-7 px-5 pb-6">
      <section className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="space-y-2">
          <Label htmlFor="match-label">Name</Label>
          <Input id="match-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={matchType} onValueChange={(v) => setMatchType(v as typeof matchType)}>
            <SelectTrigger aria-label="Match type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATCH_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Manage teams</h2>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setEditingTeam(team.id)}
              className="flex items-center gap-2 rounded-full border bg-card py-1.5 pl-3 pr-2 text-xs font-semibold uppercase shadow-xs"
              aria-label={`Edit ${team.label} players`}
            >
              {team.label}
              {team.playerIds.size > 0 ? <AvatarStack people={playersOf(team)} max={2} className="*:size-6" /> : null}
              <Pencil className="size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Manage games</h2>
          <span className="text-xs text-muted-foreground">Score</span>
        </div>
        {games.map((game, index) => {
          const winner = winnerOf(game);
          return (
            <div key={game.id} className="space-y-2 rounded-2xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label={`Remove game ${index + 1}`}
                  onClick={() => setGames((list) => list.filter((g) => g.id !== game.id))}
                >
                  <Minus />
                </Button>
                <span className="text-sm font-semibold">Game {index + 1}</span>
              </div>
              {teams.map((team) => (
                <div key={team.id} className="flex items-center gap-3 pl-10">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold uppercase">
                    {team.label}
                    {team.playerIds.size > 0 && <AvatarStack people={playersOf(team)} max={2} className="*:size-6" />}
                  </span>
                  <Input
                    inputMode="numeric"
                    aria-label={`${team.label} score for game ${index + 1}`}
                    className="h-9 w-16 text-center tabular-nums"
                    value={game.scores[team.id] ?? ""}
                    onChange={(e) => setScore(game.id, team.id, e.target.value)}
                  />
                  <span className="w-5">{winner === team.id && <Crown className="size-5 text-amber-500" />}</span>
                </div>
              ))}
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={addGame}>
          <Plus /> Add game
        </Button>
      </section>

      <Button type="button" size="lg" className="w-full" disabled={pending} onClick={saveAll}>
        {pending ? "Saving" : "Save all"}
      </Button>

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
