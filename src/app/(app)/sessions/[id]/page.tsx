import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/src/components/avatar-stack";
import { SessionCover } from "@/src/components/court-art";
import { SessionMenu } from "@/src/components/session-menu";
import { LocalTimeRange } from "@/src/components/local-time";
import { longDate, money, plural } from "@/src/lib/format";
import { summarize } from "@/src/lib/matches";
import { unwrap } from "@/src/lib/result";
import { can } from "@/src/lib/roles";
import type { Match } from "@/src/contract";
import { backend } from "@/src/server";

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const me = unwrap(await backend.accounts.getCurrent());
  const fee = money(session.courtFee, session.currency);
  const canScore = can(session.myRole, "EDITOR");

  return (
    <main>
      <section className="bg-primary px-5 pb-6 text-primary-foreground">
        <div className="flex h-16 items-center justify-between">
          <Link href="/sessions" className="inline-flex items-center gap-1 text-sm font-medium">
            <ChevronLeft className="size-5" />
            Sessions
          </Link>
          <SessionMenu
            sessionId={session.id}
            label={session.label}
            myAccountId={me.account.id}
            canEdit={can(session.myRole, "MANAGER")}
            canDelete={session.myRole === "OWNER"}
            canLeave={session.myRole !== "OWNER"}
          />
        </div>
        <p className="text-sm text-primary-foreground/80">
          {longDate(session.date)}
          <LocalTimeRange start={session.startTime} end={session.endTime} prefix=" · " />
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">{session.label}</h1>
        <SessionCover url={session.coverUrl} className="mt-5 h-44 rounded-3xl shadow-xl" />
      </section>

      <section className="grid grid-cols-2 gap-4 border-b px-5 py-5">
        <Fact label="Location" value={session.location ?? "Not set"} href={session.locationUrl} />
        <Fact label="Court fee" value={fee ?? "Not set"} />
      </section>

      <Link
        href={can(session.myRole, "MANAGER") ? `/sessions/${session.id}/edit` : "#"}
        className="flex items-center gap-3 border-b px-5 py-4"
        aria-disabled={!can(session.myRole, "MANAGER")}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Members</p>
          <div className="mt-2 flex items-center gap-3">
            <AvatarStack people={session.members} max={4} />
            <span className="text-sm text-muted-foreground">{plural(session.members.length, "member")}</span>
          </div>
        </div>
        {can(session.myRole, "MANAGER") && <ChevronRight className="size-5 text-muted-foreground" />}
      </Link>

      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Matches</h2>
          {canScore && (
            <Link href={`/sessions/${session.id}/matches/edit`} className="text-sm font-semibold text-primary">
              Edit
            </Link>
          )}
        </div>
        {session.matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            No matches yet.
            {canScore && (
              <>
                {" "}
                <Link href={`/sessions/${session.id}/matches/edit`} className="font-semibold text-primary">
                  Add the first one
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {session.matches.map((match, index) => (
              <li key={match.id}>
                <MatchCard sessionId={session.id} match={match} index={index} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Fact({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function MatchCard({ sessionId, match, index }: { sessionId: string; match: Match; index: number }) {
  const { rows, winnerId } = summarize(match);
  const [left, right] = rows;
  return (
    <Link
      href={`/sessions/${sessionId}/matches/${match.id}`}
      className="block rounded-2xl border bg-card p-4 shadow-xs transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          {match.label || `Match ${index + 1}`} · {match.matchType}
        </span>
        <ChevronRight className="size-4" />
      </div>
      {left && right ? (
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack people={left.team.players} max={2} />
          <div className="flex items-center gap-3 text-2xl font-bold tabular-nums">
            <span className={winnerId === left.team.id ? "text-primary" : ""}>
              {winnerId === left.team.id && <Crown className="mr-1 inline size-4 -translate-y-1 text-amber-500" />}
              {left.wins}
            </span>
            <span className="text-xs font-medium text-muted-foreground">vs</span>
            <span className={winnerId === right.team.id ? "text-primary" : ""}>
              {winnerId === right.team.id && <Crown className="mr-1 inline size-4 -translate-y-1 text-amber-500" />}
              {right.wins}
            </span>
          </div>
          <AvatarStack people={right.team.players} max={2} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Teams are not set up yet.</p>
      )}
    </Link>
  );
}
