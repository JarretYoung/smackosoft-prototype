import { Banknote, ChevronLeft, MapPin, Users, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { RowChevron } from "@/src/components/row-chevron";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { atLeast } from "@/src/contract";
import { AddFirstButtons } from "@/src/features/matches/add-first-buttons";
import { GameResultCard } from "@/src/features/matches/game-result-card";
import { MatchCard } from "@/src/features/matches/match-card";
import { MATCH_TYPE_LABEL } from "@/src/features/matches/match-type";
import { FactRow, RowIcon } from "@/src/features/sessions/fact-row";
import { MembersSheetRow } from "@/src/features/sessions/members-sheet";
import { SessionMenu } from "@/src/features/sessions/session-menu";
import { WhenRow } from "@/src/features/sessions/when-row";
import { attentionOf } from "@/src/features/videos/videos";
import { money, plural } from "@/src/lib/format";
import { unwrap } from "@/src/lib/result";
import { getViewerZone } from "@/src/lib/viewer-zone";
import { todayIn } from "@/src/lib/zoned";
import { backend } from "@/src/server";

/** A titled list of results with an Edit link for people who can score. */
function ResultsSection({
  id,
  title,
  editHref,
  children,
}: {
  id: string;
  title: string;
  editHref: string | false;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id={`${id}-heading`} className="section-title">
          {title}
        </h2>
        {editHref && (
          <Button asChild variant="text" size="sm">
            <Link href={editHref}>Edit</Link>
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sessionResult, meResult, videosResult, viewerZone] = await Promise.all([
    backend.sessions.get({ sessionId: id }),
    backend.accounts.getCurrent(),
    backend.videos.listBySession({ sessionId: id }),
    getViewerZone(),
  ]);
  const session = unwrap(sessionResult);
  const me = unwrap(meResult);
  const videos = unwrap(videosResult);
  const fee = money(session.courtFee, session.currency);
  const canManage = atLeast(session.myRole, "MANAGER");
  const canScore = atLeast(session.myRole, "EDITOR");
  const { unsynced, unassigned } = attentionOf(
    videos,
    session.matches.flatMap((m) => m.games.map((g) => g.id)),
    null,
  );
  // A best of 1 match is a game played on its own. Any other format is a match with games under it.
  const matches = session.matches.filter((m) => m.format !== "BO1");
  const games = session.matches.filter((m) => m.format === "BO1");
  const needAttention = unsynced.length + unassigned.length;
  const videoCount = new Set(videos.map((l) => l.videoId)).size;

  const membersRow = (
    <>
      <RowIcon>
        <Users />
      </RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-muted-foreground">Members</p>
        <div className="mt-1 flex items-center gap-2">
          <AvatarStack people={session.members} max={4} />
          <span className="text-sm text-muted-foreground">{plural(session.members.length, "member")}</span>
        </div>
      </div>
    </>
  );

  return (
    <main className="flex flex-col gap-7">
      {/* The one bold surface on this screen: what this session is. */}
      <section className="hero rounded-b-4xl px-4 pb-6 shadow-float">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/sessions"
            className="pressable inline-flex h-10 items-center gap-0.5 rounded-full bg-white/20 pr-4 pl-2 text-subhead font-semibold backdrop-blur"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
            Sessions
          </Link>
          <SessionMenu
            sessionId={session.id}
            label={session.label}
            myAccountId={me.account.id}
            canEdit={canManage}
            canDelete={session.myRole === "OWNER"}
            canLeave={session.myRole !== "OWNER"}
          />
        </div>
        <h1 className="px-1 text-[2.125rem] leading-[1.1] font-bold tracking-tight">{session.label}</h1>
        {session.coverUrl && <SessionCover url={session.coverUrl} className="mt-5 h-44 rounded-xl shadow-float" />}
      </section>

      <div className="flex flex-col gap-7 px-4">
        <section aria-label="Details" className="group-list">
          <WhenRow
            date={session.date}
            start={session.startTime}
            end={session.endTime}
            zone={session.timezone}
            viewerZone={viewerZone}
            today={todayIn(viewerZone)}
          />
          <FactRow icon={<MapPin />} label="Location">
            {session.location ? (
              session.locationUrl ? (
                <a
                  href={session.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {session.location}
                </a>
              ) : (
                <span className="font-semibold">{session.location}</span>
              )
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </FactRow>
          <FactRow icon={<Banknote />} label="Court fee">
            {fee ? <span className="score text-base">{fee}</span> : <span className="text-muted-foreground">Not set</span>}
          </FactRow>
          {canManage ? (
            <Link href={`/sessions/${session.id}/edit`} className="pressable-row list-row">
              {membersRow}
              <RowChevron />
            </Link>
          ) : (
            <MembersSheetRow members={session.members}>{membersRow}</MembersSheetRow>
          )}
          <Link href={`/sessions/${session.id}/videos`} className="pressable-row list-row">
            <RowIcon>
              <Video />
            </RowIcon>
            <div className="min-w-0 flex-1">
              <p className="text-footnote text-muted-foreground">Videos</p>
              <p className="mt-0.5 text-body">
                {videoCount === 0 ? (
                  <span className="text-muted-foreground">No videos yet</span>
                ) : (
                  <>
                    {plural(videoCount, "video")}
                    {needAttention > 0 && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {needAttention} need{needAttention === 1 ? "s" : ""} attention
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <RowChevron />
          </Link>
        </section>

        {session.matches.length === 0 && (
          <section aria-label="Games and matches">
            <Empty className="bg-card shadow-card">
              <EmptyHeader>
                <EmptyTitle>Nothing played yet</EmptyTitle>
                <EmptyDescription>Add a game or a match to start keeping score.</EmptyDescription>
              </EmptyHeader>
              {canScore && <AddFirstButtons sessionId={session.id} />}
            </Empty>
          </section>
        )}

        {matches.length > 0 && (
          <ResultsSection id="matches" title="Matches" editHref={canScore && `/sessions/${session.id}/matches/edit?m=${matches[0].id}`}>
            {matches.map((match, index) => (
              <li key={match.id}>
                <MatchCard sessionId={session.id} match={match} index={index} />
              </li>
            ))}
          </ResultsSection>
        )}

        {/* A game played on its own is the card you would see inside a match, one tap from its videos. */}
        {games.length > 0 && (
          <ResultsSection id="games" title="Games" editHref={canScore && `/sessions/${session.id}/matches/edit?m=${games[0].id}`}>
            {games.map((match, index) => (
              <li key={match.id}>
                {match.games[0] ? (
                  <GameResultCard
                    sessionId={session.id}
                    match={match}
                    game={match.games[0]}
                    title={`${match.label} · ${MATCH_TYPE_LABEL[match.matchType]}`}
                  />
                ) : (
                  // Its game was deleted. The match page is where to add it back.
                  <MatchCard sessionId={session.id} match={match} index={index} />
                )}
              </li>
            ))}
          </ResultsSection>
        )}
      </div>
    </main>
  );
}
