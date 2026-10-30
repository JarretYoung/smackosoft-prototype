import { Banknote, ChevronLeft, Crown, MapPin, Plus, Users, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { MembersSheetRow } from "@/src/components/members-sheet";
import { RowChevron } from "@/src/components/row-chevron";
import { SessionMenu } from "@/src/components/session-menu";
import { LocalTimeRange } from "@/src/components/local-time";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { cn } from "@/src/lib/utils";
import { longDate, money, plural } from "@/src/lib/format";
import { summarize } from "@/src/lib/matches";
import { MATCH_TYPE_LABEL } from "@/src/lib/match-type";
import { unwrap } from "@/src/lib/result";
import { attentionOf } from "@/src/lib/videos";
import { atLeast, type Match, type Team } from "@/src/contract";
import { backend } from "@/src/server";

const names = (team: Team) =>
  team.players.length ? team.players.map((p) => p.displayName.split(" ")[0]).join(" & ") : team.label;

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const me = unwrap(await backend.accounts.getCurrent());
  const fee = money(session.courtFee, session.currency);
  const canManage = atLeast(session.myRole, "MANAGER");
  const canScore = atLeast(session.myRole, "EDITOR");
  const videos = unwrap(await backend.videos.listBySession({ sessionId: id }));
  const { unsynced, unassigned } = attentionOf(
    videos,
    session.matches.flatMap((m) => m.games.map((g) => g.id)),
    null,
  );
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
        <p className="px-1 text-subhead font-medium text-primary-foreground/90">
          {longDate(session.date)}
          <LocalTimeRange start={session.startTime} end={session.endTime} prefix=" · " />
        </p>
        <h1 className="mt-1 px-1 text-[2.125rem] leading-[1.1] font-bold tracking-tight">{session.label}</h1>
        {session.coverUrl && <SessionCover url={session.coverUrl} className="mt-5 h-44 rounded-xl shadow-float" />}
      </section>

      <div className="flex flex-col gap-7 px-4">
        <section aria-label="Details" className="group-list">
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

        <section aria-labelledby="matches-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="matches-heading" className="section-title">
              Matches
            </h2>
            {canScore && session.matches.length > 0 && (
              <Button asChild variant="text" size="sm" className="-mr-3">
                <Link href={`/sessions/${session.id}/matches/edit`}>Edit</Link>
              </Button>
            )}
          </div>
          {session.matches.length === 0 ? (
            <Empty className="bg-card shadow-card">
              <EmptyHeader>
                <EmptyTitle>No matches yet</EmptyTitle>
                <EmptyDescription>Add a match to start keeping score.</EmptyDescription>
              </EmptyHeader>
              {canScore && (
                <Button asChild>
                  <Link href={`/sessions/${session.id}/matches/edit`}>
                    <Plus /> Add the first match
                  </Link>
                </Button>
              )}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {session.matches.map((match, index) => (
                <li key={match.id}>
                  <MatchCard sessionId={session.id} match={match} index={index} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary [&_svg]:size-[1.125rem]">
      {children}
    </span>
  );
}

function FactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="list-row">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-body">{children}</p>
      </div>
    </div>
  );
}

function MatchCard({ sessionId, match, index }: { sessionId: string; match: Match; index: number }) {
  const { rows, winnerId } = summarize(match);
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
              {left.wins}
            </span>
            <span className="text-lg font-medium text-muted-foreground/60">:</span>
            <span className={cn(winnerId === right.team.id ? "text-primary" : winnerId ? "text-muted-foreground/60" : "")}>
              {right.wins}
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
        {names(team)}
      </p>
    </div>
  );
}
