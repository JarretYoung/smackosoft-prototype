import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { GameResultCard } from "@/src/features/matches/game-result-card";
import { Scoreboard } from "@/src/features/matches/scoreboard";
import { tally } from "@/src/features/matches/scores";
import { MATCH_TYPE_LABEL } from "@/src/features/matches/match-type";
import { unwrap } from "@/src/lib/result";
import { atLeast } from "@/src/contract";
import { backend } from "@/src/server";

export default async function MatchDetailsPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const match = session.matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const { rows, winnerId } = tally(match);
  const [left, right] = rows;

  return (
    <main className="flex flex-col gap-7 pb-4">
      <PageHeader
        title={match.format === "BO1" ? "Game" : "Match"}
        back={`/sessions/${id}`}
        action={
          atLeast(session.myRole, "EDITOR") && (
            <Button asChild variant="text" size="sm">
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
            <Scoreboard team={left.team} value={left.value} won={winnerId === left.team.id} lost={!!winnerId && winnerId !== left.team.id} />
            <span className="mt-[4.25rem] text-2xl leading-8 font-medium text-primary-foreground/50">:</span>
            <Scoreboard team={right.team} value={right.value} won={winnerId === right.team.id} lost={!!winnerId && winnerId !== right.team.id} />
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
        {match.games.map((game, index) => (
          <GameResultCard key={game.id} sessionId={id} match={match} game={game} title={`Game ${index + 1}`} />
        ))}
      </section>
    </main>
  );
}
