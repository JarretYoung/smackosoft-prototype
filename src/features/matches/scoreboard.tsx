import { Crown } from "lucide-react";
import { AvatarStack } from "@/src/components/avatar-stack";
import type { Team } from "@/src/contract";
import { cn } from "@/src/lib/utils";
import { teamNames } from "./scores";

export function Scoreboard({ team, wins, won, lost }: { team: Team; wins: number; won: boolean; lost: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3">
      <div className="relative">
        <AvatarStack people={team.players} max={2} size="lg" ringClassName="ring-white/30" />
        {won && <Crown aria-label="Winner" className="absolute -top-4 left-1/2 size-5 -translate-x-1/2 fill-gold text-gold" />}
      </div>
      <p className={cn("score text-[4rem] leading-none", lost && "text-primary-foreground/65")}>{wins}</p>
      <p className="w-full truncate text-center text-sm font-medium text-primary-foreground/90">{teamNames(team)}</p>
    </div>
  );
}
