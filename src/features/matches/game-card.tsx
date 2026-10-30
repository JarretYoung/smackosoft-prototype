"use client";

import { Crown, Minus } from "lucide-react";
import { LocalTimeRange } from "@/src/components/local-time";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { GameDraft, TeamDraft } from "@/src/features/matches/match-draft";
import { isoToTimeInput } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

/** One game: its times and a score box per team. The winner is marked as scores are typed. */
export function GameCard({
  game,
  index,
  teams,
  winner,
  timesOpen,
  onShowTimes,
  onTime,
  onScore,
  onRemove,
}: {
  game: GameDraft;
  index: number;
  teams: TeamDraft[];
  winner: string | null;
  timesOpen: boolean;
  onShowTimes: () => void;
  onTime: (field: "startTime" | "endTime", time: string) => void;
  onScore: (teamId: string, value: string, input: HTMLInputElement) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <h3 className="text-body font-semibold tracking-tight">Game {index + 1}</h3>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          className="ml-auto"
          aria-label={`Remove game ${index + 1}`}
          onClick={onRemove}
        >
          <Minus />
        </Button>
      </div>
      {timesOpen ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Input
            type="time"
            aria-label={`Start time for game ${index + 1}`}
            value={isoToTimeInput(game.startTime)}
            onChange={(e) => onTime("startTime", e.target.value)}
          />
          to
          <Input
            type="time"
            aria-label={`End time for game ${index + 1}`}
            value={isoToTimeInput(game.endTime)}
            onChange={(e) => onTime("endTime", e.target.value)}
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Edit times for game ${index + 1}`}
          onClick={onShowTimes}
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
        {teams.map((team) => (
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
                placeholder="-"
                className="score h-14 rounded-lg bg-card text-center text-3xl"
                value={game.scores[team.id] ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => onScore(team.id, e.target.value, e.currentTarget)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
