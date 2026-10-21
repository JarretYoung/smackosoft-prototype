import { PageHeader } from "@/src/components/page-header";
import { VideosPanel } from "@/src/components/videos/videos-panel";
import { unwrap } from "@/src/lib/result";
import { can } from "@/src/lib/roles";
import { backend } from "@/src/server";

export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  const { id } = await params;
  const { game } = await searchParams;

  const session = unwrap(await backend.sessions.get({ sessionId: id }));
  const linked = unwrap(await backend.videos.listBySession({ sessionId: id }));
  const own = unwrap(await backend.videos.listOwn({ sessionId: id }));

  const targets = session.matches.flatMap((match, mi) =>
    match.games.map((g, gi) => ({
      value: g.id,
      label: `${match.label || `Match ${mi + 1}`} · Game ${gi + 1}`,
    })),
  );

  return (
    <main>
      <PageHeader title="Videos" back={`/sessions/${id}`} />
      <VideosPanel
        sessionId={id}
        canEdit={can(session.myRole, "EDITOR")}
        targets={targets}
        linked={linked}
        own={own}
        focus={targets.some((t) => t.value === game) ? game! : null}
      />
    </main>
  );
}
