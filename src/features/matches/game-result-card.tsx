import { Crown, Video } from "lucide-react";
import Link from "next/link";
import { CourtArt } from "@/src/components/court-art";
import { RowChevron } from "@/src/components/row-chevron";
import type { Game, Match } from "@/src/contract";
import { plural } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { gameWinnerId, scoreOf, teamNames } from "./scores";

/**
 * One game with its score for each side. It opens that game's videos.
 * The match page lists these under a match, and the session page lists the games played on their own.
 */
export function GameResultCard({
  sessionId,
  match,
  game,
  title,
}: {
  sessionId: string;
  match: Match;
  game: Game;
  title: string;
}) {
  const winner = gameWinnerId(match, game.id);
  return (
    <Link
      href={`/sessions/${sessionId}/videos?game=${game.id}`}
      className="pressable flex overflow-hidden rounded-2xl bg-card shadow-card"
    >
      <div className="relative w-28 shrink-0">
        <CourtArt className="absolute inset-0" />
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-caption font-semibold text-white backdrop-blur">
          <Video className="size-3" />
          {plural(game.videoCount, "Video")}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-4 pl-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-footnote font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
          <RowChevron />
        </div>
        {match.teams.map((team) => (
          <div key={team.id} className="flex items-center gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-sm", winner === team.id ? "font-semibold" : "text-muted-foreground")}>
              {teamNames(team)}
            </span>
            {winner === team.id && <Crown aria-label="Won" className="size-4 shrink-0 fill-gold text-gold" />}
            <span className={cn("score w-7 text-right text-base", winner !== team.id && "text-muted-foreground")}>
              {scoreOf(match, game.id, team) ?? "-"}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
