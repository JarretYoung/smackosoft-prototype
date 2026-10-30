import { VideosPanel } from "@/src/features/videos/videos-panel";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";
import { atLeast } from "@/src/contract";

export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  const { id } = await params;
  const { game } = await searchParams;

  const [sessionResult, linkedResult] = await Promise.all([
    backend.sessions.get({ sessionId: id }),
    backend.videos.listBySession({ sessionId: id }),
  ]);
  const session = unwrap(sessionResult);
  const linked = unwrap(linkedResult);

  const matches = session.matches.map((match, mi) => ({
    id: match.id,
    label: match.label || `Match ${mi + 1}`,
    games: match.games.map((g) => ({ id: g.id, gameNumber: g.gameNumber })),
  }));

  return (
    <main>
      <VideosPanel sessionId={id} canEdit={atLeast(session.myRole, "EDITOR")} matches={matches} linked={linked} focus={game ?? null} />
    </main>
  );
}
