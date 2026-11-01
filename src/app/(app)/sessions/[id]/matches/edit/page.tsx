import { notFound } from "next/navigation";
import { MatchEditor } from "@/src/features/matches/match-editor";
import { MatchSwitcher } from "@/src/features/matches/match-switcher";
import { PageHeader } from "@/src/components/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/src/components/ui/empty";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";
import { atLeast } from "@/src/contract";

export default async function EditMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  if (!atLeast(session.myRole, "EDITOR")) notFound();

  const match = session.matches.find((x) => x.id === m) ?? session.matches[0] ?? null;

  return (
    <main>
      <PageHeader title={match?.format === "BO1" ? "Edit game" : "Edit match"} back={`/sessions/${id}`} />
      <MatchSwitcher
        sessionId={id}
        matches={session.matches.map((x) => ({ id: x.id, label: x.label, format: x.format, matchType: x.matchType }))}
        currentId={match?.id ?? null}
      />
      {match ? (
        // Keyed by match so switching matches starts from that match's saved state.
        <MatchEditor key={match.id} sessionId={id} timezone={session.timezone} match={match} members={session.members} />
      ) : (
        <div className="px-4">
          <Empty className="bg-card shadow-card">
            <EmptyHeader>
              <EmptyTitle>Nothing yet</EmptyTitle>
              <EmptyDescription>Use the plus button above to add a game or a match.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </main>
  );
}
