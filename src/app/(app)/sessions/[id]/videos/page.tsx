import { VideosPanel } from "@/src/features/videos/videos-panel";
import { playlistOf } from "@/src/features/videos/videos";
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

  return (
    <main>
      <VideosPanel
        sessionId={id}
        sessionLabel={session.label}
        canEdit={atLeast(session.myRole, "EDITOR")}
        games={playlistOf(session.matches)}
        linked={linked}
        focus={game ?? null}
      />
    </main>
  );
}
