"use client";

import { CheckCircle2, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeVideoGames, removeVideoSessions, saveVideoGames, saveVideoSessions, saveVideos } from "@/src/features/videos/actions";
import { AddRow } from "@/src/components/add-row";
import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import type { SessionVideo } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { plural } from "@/src/lib/format";
import { attentionOf } from "@/src/features/videos/videos";
import { AddVideoSheet } from "./add-video-sheet";
import type { NewVideo } from "./use-add-video-form";
import { PickSheet, type PickItem } from "./pick-sheet";
import { SyncSheet, type SyncTarget } from "./sync-sheet";
import { AddVideoRow, GameVideoRow, UnassignedRow } from "./video-rows";

export type MatchGroup = { id: string; label: string; games: { id: string; gameNumber: number }[] };
type Target = { value: string; label: string };

type Result = { ok: true } | { ok: false; error: Parameters<typeof errorMessage>[0] };
type Picking = { kind: "game"; video: SessionVideo["video"] } | { kind: "video"; game: Target };

const rowId = (videoId: string, matchGameId: string | null) => `video-${videoId}-${matchGameId ?? "session"}`;

/**
 * Videos for one session, on one page. Each match is a heading with its games under it,
 * in order, and each game lists its videos. Videos that no game uses yet sit at the bottom
 * as unassigned. With `focus` the page shows that one game only.
 * Assigning a video to a game and adding a video to a game are the same flow: pick a game
 * or a video, then sync. "Not now" in the sync sheet leaves the video not synced.
 */
export function VideosPanel({
  sessionId,
  canEdit,
  matches,
  linked,
  focus,
}: {
  sessionId: string;
  canEdit: boolean;
  matches: MatchGroup[];
  linked: SessionVideo[];
  focus: string | null;
}) {
  const [adding, setAdding] = useState<{ game: Target | null } | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [syncing, setSyncing] = useState<SyncTarget | null>(null);
  const [pending, start] = useTransition();

  const targets: Target[] = matches.flatMap((m) => m.games.map((g) => ({ value: g.id, label: `${m.label} · Game ${g.gameNumber}` })));
  const labelOf = (gameId: string) => targets.find((t) => t.value === gameId)?.label ?? "A game";

  // A video in the session has one row with no game. Its other rows say which games it is in.
  const sessionRows = linked.filter((l) => l.matchGameId === null);
  const gameRows = linked.filter((l) => l.matchGameId !== null);
  const videosOf = (gameId: string) => gameRows.filter((l) => l.matchGameId === gameId);
  const { unsynced, unassigned } = attentionOf(linked, targets.map((t) => t.value), focus);

  // With a focus, only the match that holds the game is shown, and only that game in it.
  const shown = matches
    .map((m) => ({ ...m, games: focus ? m.games.filter((g) => g.id === focus) : m.games }))
    .filter((m) => m.games.length > 0 || !focus);

  const attention = unsynced.length + unassigned.length;
  const first = unsynced[0] ?? unassigned[0];
  const firstId = first ? rowId(first.videoId, first.matchGameId) : undefined;
  const idFor = (item: SessionVideo) => (rowId(item.videoId, item.matchGameId) === firstId ? firstId : undefined);

  function run(action: () => Promise<Result>, done: string, then?: () => void) {
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success(done);
      then?.();
    });
  }

  function addVideo(video: NewVideo) {
    const videoId = crypto.randomUUID();
    const game = adding?.game ?? null;
    run(
      async () => {
        const saved = await saveVideos([{ id: videoId, ...video }]);
        // A link to a game also puts the video in the session.
        if (!saved.ok) return saved;
        return game ? saveVideoGames([{ videoId, matchGameId: game.value }]) : saveVideoSessions([{ videoId, sessionId }]);
      },
      "Video added",
      () => {
        setAdding(null);
        if (game) setSyncing({ videoId, label: video.label, matchGameId: game.value, gameLabel: game.label, offset: null });
      },
    );
  }

  /** Puts the video in the game with no sync point, then opens the sync sheet. */
  function addToGame(video: SessionVideo["video"], game: Target) {
    run(
      () => saveVideoGames([{ videoId: video.id, matchGameId: game.value }]),
      "Added to game",
      () => {
        setPicking(null);
        setSyncing({ videoId: video.id, label: video.label, matchGameId: game.value, gameLabel: game.label, offset: null });
      },
    );
  }

  function saveSync(target: SyncTarget, offset: number | null) {
    run(
      () => saveVideoGames([{ videoId: target.videoId, matchGameId: target.matchGameId, canonicalOffset: offset }]),
      offset === null ? "Sync point cleared" : "Sync point saved",
      () => setSyncing(null),
    );
  }

  const openSync = (item: SessionVideo) =>
    setSyncing({
      videoId: item.videoId,
      label: item.video.label,
      matchGameId: item.matchGameId!,
      gameLabel: labelOf(item.matchGameId!),
      offset: item.canonicalOffset,
    });

  const remove = (item: SessionVideo, done: string) =>
    run(
      () =>
        item.matchGameId
          ? removeVideoGames([{ videoId: item.videoId, matchGameId: item.matchGameId }])
          : removeVideoSessions([{ videoId: item.videoId, sessionId }]),
      done,
    );

  // What the picker offers depends on which side was chosen first.
  const pickItems: PickItem[] =
    picking?.kind === "game"
      ? targets
          .filter((t) => !videosOf(t.value).some((l) => l.videoId === picking.video.id))
          .map((t) => ({ key: t.value, label: t.label, detail: plural(videosOf(t.value).length, "video") }))
      : picking?.kind === "video"
        ? sessionRows
            .filter((p) => !videosOf(picking.game.value).some((l) => l.videoId === p.videoId))
            .map((p) => ({ key: p.videoId, label: p.video.label, thumbnailUrl: p.video.thumbnailUrl }))
        : [];

  function pick(key: string) {
    if (picking?.kind === "game") {
      const game = targets.find((t) => t.value === key);
      if (game) addToGame(picking.video, game);
    } else if (picking?.kind === "video") {
      const video = sessionRows.find((p) => p.videoId === key)?.video;
      if (video) addToGame(video, picking.game);
    }
  }

  return (
    <>
      <PageHeader
        title="Videos"
        back={`/sessions/${sessionId}`}
        action={
          canEdit && (
            <Button variant="ghost" size="icon" className="text-primary" aria-label="Add video" onClick={() => setAdding({ game: null })}>
              <Plus className="size-6" strokeWidth={2.25} />
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-7 px-4 pt-3 pb-6">
        {attention > 0 ? (
          <button
            type="button"
            onClick={() => firstId && document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="pressable -mb-3 inline-flex items-center gap-1.5 self-start px-1 text-sm font-medium text-accent-foreground"
          >
            <TriangleAlert className="size-4" /> {attention} need{attention === 1 ? "s" : ""} attention
          </button>
        ) : (
          linked.length > 0 && (
            <p className="-mb-3 inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" /> All synced
            </p>
          )
        )}

        {shown.map((match) => (
          <section key={match.id} aria-label={match.label} className="flex flex-col gap-4">
            <h2 className="px-1 text-2xl font-bold tracking-tight">{match.label}</h2>
            {match.games.length === 0 && <p className="px-1 text-sm text-muted-foreground">No games yet</p>}
            {match.games.map((g) => {
              const game = { value: g.id, label: `${match.label} · Game ${g.gameNumber}` };
              const inGame = videosOf(g.id);
              return (
                <div key={g.id} role="group" aria-label={`Game ${g.gameNumber}`} className="flex flex-col gap-2">
                  <h3 className="section-label">Game {g.gameNumber}</h3>
                  <ul className="group-list">
                    {inGame.map((item) => (
                      <GameVideoRow
                        key={item.videoId}
                        item={item}
                        canEdit={canEdit}
                        highlightId={idFor(item)}
                        onSync={() => openSync(item)}
                        onRemove={() => remove(item, "Removed from game")}
                      />
                    ))}
                    {canEdit && <AddVideoRow onClick={() => setPicking({ kind: "video", game })} />}
                    {!canEdit && inGame.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No videos</li>}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}

        {unassigned.length > 0 && (
          <section aria-label="Unassigned" className="flex flex-col gap-3">
            <h2 className="px-1 text-2xl font-bold tracking-tight">Unassigned</h2>
            <ul className="group-list">
              {unassigned.map((item) => (
                <UnassignedRow
                  key={item.videoId}
                  item={item}
                  canEdit={canEdit}
                  highlightId={idFor(item)}
                  onAssign={() => setPicking({ kind: "game", video: item.video })}
                  onRemove={() => remove(item, "Removed from session")}
                />
              ))}
            </ul>
          </section>
        )}

        {focus && (
          <Button asChild variant="link" className="self-start px-1">
            <Link href={`/sessions/${sessionId}/videos`}>All games</Link>
          </Button>
        )}
      </div>

      <AddVideoSheet open={adding !== null} pending={pending} onClose={() => setAdding(null)} onAdd={addVideo} />

      <PickSheet
        open={picking !== null}
        title={picking?.kind === "game" ? "Assign to game" : "Add video"}
        description={picking?.kind === "game" ? picking.video.label : (picking?.game.label ?? "")}
        items={pickItems}
        withThumbs={picking?.kind === "video"}
        onPick={pick}
        onClose={() => setPicking(null)}
        empty={
          <p className="text-sm text-muted-foreground">
            {picking?.kind === "video" ? "No other videos in this session." : "Already in every game."}
          </p>
        }
        action={
          picking?.kind === "video" && (
            <div className="group-list mt-3 border border-border/60 shadow-none">
              <AddRow
                onClick={() => {
                  setAdding({ game: picking.game });
                  setPicking(null);
                }}
              >
                New video
              </AddRow>
            </div>
          )
        }
      />

      <SyncSheet target={syncing} pending={pending} onClose={() => setSyncing(null)} onSave={saveSync} />
    </>
  );
}
