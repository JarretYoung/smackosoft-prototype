import { Crown, Pencil, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourtArt } from "@/src/components/court-art";
import { PageHeader } from "@/src/components/page-header";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { cn } from "@/src/lib/utils";
import { Scoreboard } from "@/src/features/matches/scoreboard";
import { gameWinnerId, scoreOf, summarize, teamNames } from "@/src/features/matches/scores";
import { plural } from "@/src/lib/format";
import { MATCH_TYPE_LABEL } from "@/src/features/matches/match-type";
import { unwrap } from "@/src/lib/result";
import { atLeast } from "@/src/contract";
import { backend } from "@/src/server";

export default async function MatchDetailsPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const match = session.matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const { rows, winnerId } = summarize(match);
  const [left, right] = rows;

  return (
    <main className="flex flex-col gap-7 pb-4">
      <PageHeader
        title="Match"
        back={`/sessions/${id}`}
        action={
          atLeast(session.myRole, "EDITOR") && (
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href={`/sessions/${id}/matches/edit?m=${match.id}`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )
        }
      />

      {/* The one bold surface on this screen: the score. */}
      <section aria-label="Result" className="hero mx-4 rounded-4xl p-6 shadow-float">
        <p className="text-center text-footnote font-semibold tracking-wider text-primary-foreground/90 uppercase">
          {match.label} · {MATCH_TYPE_LABEL[match.matchType]}
        </p>
        {left && right ? (
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <Scoreboard team={left.team} wins={left.wins} won={winnerId === left.team.id} lost={!!winnerId && winnerId !== left.team.id} />
            <span className="mt-[4.25rem] text-2xl leading-8 font-medium text-primary-foreground/50">:</span>
            <Scoreboard team={right.team} wins={right.wins} won={winnerId === right.team.id} lost={!!winnerId && winnerId !== right.team.id} />
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-primary-foreground/90">Teams are not set up yet.</p>
        )}
      </section>

      <section aria-labelledby="games-heading" className="flex flex-col gap-3 px-4">
        <h2 id="games-heading" className="section-title">
          Games
        </h2>
        {match.games.length === 0 && (
          <Empty className="bg-card shadow-card">
            <EmptyHeader>
              <EmptyTitle>No games yet</EmptyTitle>
              <EmptyDescription>Games appear here once someone adds them to the match.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {match.games.map((game, index) => {
          const winner = gameWinnerId(match, game.id);
          return (
            <Link
              key={game.id}
              href={`/sessions/${id}/videos?game=${game.id}`}
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
                <div className="flex items-center justify-between">
                  <p className="text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
                    Game {index + 1}
                  </p>
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
        })}
      </section>
    </main>
  );
}
