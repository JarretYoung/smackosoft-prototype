import { Crown } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { RowChevron } from "@/src/components/row-chevron";
import type { Match, Team } from "@/src/contract";
import { cn } from "@/src/lib/utils";
import { MATCH_TYPE_LABEL } from "./match-type";
import { tally, teamNames } from "./scores";

export function MatchCard({ sessionId, match, index }: { sessionId: string; match: Match; index: number }) {
  const { rows, winnerId } = tally(match);
  const [left, right] = rows;
  return (
    <Link
      href={`/sessions/${sessionId}/matches/${match.id}`}
      className="pressable block rounded-2xl bg-card p-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
          {match.label || `Match ${index + 1}`} · {MATCH_TYPE_LABEL[match.matchType]}
        </span>
        <RowChevron />
      </div>
      {left && right ? (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Side team={left.team} won={winnerId === left.team.id} />
          <div className="score flex items-center gap-2.5 text-[2.25rem] leading-none">
            <span className={cn(winnerId === left.team.id ? "text-primary" : winnerId ? "text-muted-foreground/60" : "")}>
              {left.value}
            </span>
            <span className="text-lg font-medium text-muted-foreground/60">:</span>
            <span className={cn(winnerId === right.team.id ? "text-primary" : winnerId ? "text-muted-foreground/60" : "")}>
              {right.value}
            </span>
          </div>
          <Side team={right.team} won={winnerId === right.team.id} align="end" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Teams are not set up yet.</p>
      )}
    </Link>
  );
}

function Side({ team, won, align }: { team: Team; won: boolean; align?: "end" }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", align === "end" ? "items-end" : "items-start")}>
      <div className="relative">
        <AvatarStack people={team.players} max={2} />
        {won && (
          <Crown
            aria-label="Winner"
            className={cn("absolute -top-3.5 size-4 fill-gold text-gold", align === "end" ? "right-1" : "left-1")}
          />
        )}
      </div>
      <p className={cn("w-full truncate text-sm", won ? "font-semibold" : "text-muted-foreground", align === "end" && "text-right")}>
        {teamNames(team)}
      </p>
    </div>
  );
}
