"use client";

import { Crown, Minus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { GameDraft, TeamDraft } from "@/src/features/matches/match-draft";
import { cn } from "@/src/lib/utils";

/** One game: a score box per team. The winner is marked as scores are typed. */
export function GameCard({
  game,
  index,
  teams,
  winner,
  onScore,
  onRemove,
  solo = false,
}: {
  game: GameDraft;
  index: number;
  /** The only game of a best of 1 match. The match is the game, so it has no title and cannot be removed here. */
  solo?: boolean;
  teams: TeamDraft[];
  winner: string | null;
  onScore: (teamId: string, value: string, input: HTMLInputElement) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card">
      {!solo && (
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
