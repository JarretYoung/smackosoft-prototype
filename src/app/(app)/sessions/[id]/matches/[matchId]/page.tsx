import { Crown, Pencil, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarStack } from "@/src/components/avatar-stack";
import { CourtArt } from "@/src/components/court-art";
import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import { gameWinnerId, scoreOf, summarize } from "@/src/lib/matches";
import { plural } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import { can } from "@/src/lib/roles";
import type { Team } from "@/src/contract";
import { backend } from "@/src/server";

const names = (team: Team) =>
  team.players.length ? team.players.map((p) => p.displayName.split(" ")[0]).join(" & ") : team.label;

export default async function MatchDetailsPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const match = session.matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const { rows, winnerId } = summarize(match);
  const [left, right] = rows;

  return (
    <main>
      <PageHeader
        title="Match details"
        back={`/sessions/${id}`}
        action={
          can(session.myRole, "EDITOR") && (
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href={`/sessions/${id}/matches/edit?m=${match.id}`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )
        }
      />

      <section className="border-b px-5 py-5">
        <h2 className="text-xl font-semibold">
          {match.label} <span className="text-sm font-medium text-muted-foreground">· {match.matchType}</span>
        </h2>
        {left && right ? (
          <div className="mt-4 flex items-center justify-between">
            <AvatarStack people={left.team.players} max={2} className="*:size-11" />
            <div className="flex items-center gap-3 text-3xl font-bold tabular-nums">
              <span className={winnerId === left.team.id ? "text-primary" : ""}>{left.wins}</span>
              <span className="text-lg font-medium text-muted-foreground">-</span>
              <span className={winnerId === right.team.id ? "text-primary" : ""}>{right.wins}</span>
            </div>
            <AvatarStack people={right.team.players} max={2} className="*:size-11" />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Teams are not set up yet.</p>
        )}
      </section>

      <section className="space-y-3 px-5 pt-5">
        {match.games.length === 0 && <p className="text-sm text-muted-foreground">No games yet.</p>}
        {match.games.map((game, index) => {
          const winner = gameWinnerId(match, game.id);
          return (
            <Link
              key={game.id}
              href={`/sessions/${id}/videos?game=${game.id}`}
              className="flex overflow-hidden rounded-2xl border bg-card shadow-xs transition active:scale-[0.99]"
            >
              <div className="relative w-28 shrink-0">
                <CourtArt className="absolute inset-0" />
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <Video className="size-3" />
                  {plural(game.videoCount, "Video")}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 p-3">
                <p className="text-sm font-semibold">Game {index + 1}</p>
                {match.teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{names(team)}</span>
                    {winner === team.id && <Crown className="size-4 shrink-0 text-amber-500" />}
                    <span className="w-6 text-right font-semibold tabular-nums">{scoreOf(match, game.id, team) ?? "-"}</span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
