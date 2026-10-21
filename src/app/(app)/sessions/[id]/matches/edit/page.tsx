import { notFound } from "next/navigation";
import { MatchEditor } from "@/src/components/match-editor/match-editor";
import { MatchSwitcher } from "@/src/components/match-editor/match-switcher";
import { PageHeader } from "@/src/components/page-header";
import { unwrap } from "@/src/lib/result";
import { can } from "@/src/lib/roles";
import { backend } from "@/src/server";

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
  if (!can(session.myRole, "EDITOR")) notFound();

  const match = session.matches.find((x) => x.id === m) ?? session.matches[0] ?? null;

  return (
    <main>
      <PageHeader title="Edit match" back={`/sessions/${id}`} />
      <MatchSwitcher
        sessionId={id}
        matches={session.matches.map((x) => ({ id: x.id, label: x.label }))}
        currentId={match?.id ?? null}
      />
      {match ? (
        // Keyed by match so switching matches starts from that match's saved state.
        <MatchEditor key={match.id} sessionId={id} match={match} members={session.members} />
      ) : (
        <p className="px-5 text-sm text-muted-foreground">No matches yet. Use the plus button to add one.</p>
      )}
    </main>
  );
}
