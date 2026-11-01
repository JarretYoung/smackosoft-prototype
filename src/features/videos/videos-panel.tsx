"use client";

import { ExternalLink, Play, Plus, SkipForward, Video } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeVideoGames, removeVideoSessions, saveVideoGames, saveVideoSessions, saveVideos } from "@/src/features/videos/actions";
import { AddRow } from "@/src/components/add-row";
import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import type { SessionVideo } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { plural } from "@/src/lib/format";
import { openUrl } from "@/src/features/videos/offset";
import { playableOf, thumbnailOf } from "@/src/features/videos/player";
import { cn } from "@/src/lib/utils";
import { VideoPlayer } from "./video-player";
import { attentionOf, type PlaylistGame } from "@/src/features/videos/videos";
import { AddVideoSheet } from "./add-video-sheet";
import type { NewVideo } from "./use-add-video-form";
import { PickSheet, type PickItem } from "./pick-sheet";
import { SyncSheet, type SyncTarget } from "./sync-sheet";
import { EmptyGameRow, GameRow, markOf, UnlinkedRow, VideoThumb } from "./video-rows";

type Target = { value: string; label: string };

type Result = { ok: true } | { ok: false; error: Parameters<typeof errorMessage>[0] };
type Picking = { kind: "game"; video: SessionVideo["video"] } | { kind: "video"; game: Target };

const rowId = (videoId: string, matchGameId: string | null) => `video-${videoId}-${matchGameId ?? "session"}`;

/**
 * The videos of one session as a playlist. Each game is a row, in the order it was played: its video
 * if it has one, otherwise a quiet "Add a video". Videos that no game uses yet sit under the list as
 * "Not linked to a game". With `focus` the page shows that one game only.
 * Assigning a video to a game and adding a video to a game are the same flow: pick a game
 * or a video, then sync. "Not now" in the sync sheet leaves the video not synced.
 */
export function VideosPanel({
  sessionId,
  sessionLabel,
  canEdit,
  games,
  linked,
  focus,
}: {
  sessionId: string;
  sessionLabel: string;
  canEdit: boolean;
  games: PlaylistGame[];
  linked: SessionVideo[];
  focus: string | null;
}) {
  const [adding, setAdding] = useState<{ game: Target | null } | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [syncing, setSyncing] = useState<SyncTarget | null>(null);
  const [playing, setPlaying] = useState<{ videoId: string; gameId: string | null } | null>(null);
  const [pending, start] = useTransition();

  const targets: Target[] = games.map((g) => ({ value: g.id, label: g.name }));
  const labelOf = (gameId: string) => targets.find((t) => t.value === gameId)?.label ?? "A game";

  // A video in the session has one row with no game. Its other rows say which games it is in.
  const sessionRows = linked.filter((l) => l.matchGameId === null);
  const gameRows = linked.filter((l) => l.matchGameId !== null);
  const videosOf = (gameId: string) => gameRows.filter((l) => l.matchGameId === gameId);
  const { unsynced, unassigned } = attentionOf(linked, games.map((g) => g.id), focus);

  const shown = focus ? games.filter((g) => g.id === focus) : games;
  const featured = shown.map((g) => ({ game: g, item: videosOf(g.id)[0] })).find((f) => f.item);

  // No video anywhere in the session. An editor with games still gets an "Add a video" row for each,
  // so the empty state is only for an editor with nothing to attach to, and for a viewer.
  const nothingYet = linked.length === 0 && (games.length === 0 || !canEdit);

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

  // What is playing is a row: a video in a game. If that row goes away (removed, unlinked), nothing plays.
  const playingItem = playing && linked.find((l) => l.videoId === playing.videoId && l.matchGameId === playing.gameId);
  const playingGame = playingItem && games.find((g) => g.id === playingItem.matchGameId);
  const playable = playingItem ? playableOf(playingItem.video.videoUrl, playingItem.canonicalOffset) : null;
  const isPlaying = (item: SessionVideo) => playingItem?.videoId === item.videoId && playingItem?.matchGameId === item.matchGameId;

  // The next game that has a video, in the order the games were played.
  const queue = shown.flatMap((g) => videosOf(g.id).slice(0, 1));
  const nextItem = playingItem ? queue[queue.findIndex(isPlaying) + 1] : undefined;

  /** Plays in the page when the link allows it, otherwise opens it at the sync point in a new tab. */
  function play(item: SessionVideo) {
    if (playableOf(item.video.videoUrl, item.canonicalOffset)) return setPlaying({ videoId: item.videoId, gameId: item.matchGameId });
    window.open(openUrl(item.video.videoUrl, item.canonicalOffset), "_blank", "noopener,noreferrer");
  }

  // What the picker offers depends on which side was chosen first.
  const pickItems: PickItem[] =
    picking?.kind === "game"
      ? targets
          .filter((t) => !videosOf(t.value).some((l) => l.videoId === picking.video.id))
          .map((t) => ({ key: t.value, label: t.label, detail: plural(videosOf(t.value).length, "video") }))
      : picking?.kind === "video"
        ? sessionRows
            .filter((p) => !videosOf(picking.game.value).some((l) => l.videoId === p.videoId))
            .map((p) => ({ key: p.videoId, label: p.video.label, thumbnailUrl: p.video.thumbnailUrl ?? thumbnailOf(p.video.videoUrl) }))
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

  const videoCount = new Set(linked.map((l) => l.videoId)).size;

  return (
    <>
      <PageHeader
        title="Videos"
        back={`/sessions/${sessionId}`}
        action={
          canEdit && (
            <Button variant="bare" size="icon" aria-label="Add video" onClick={() => setAdding({ game: null })}>
              <Plus />
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6 px-4 pt-3 pb-6">
        {nothingYet ? (
          <Empty className="bg-card shadow-card">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-accent text-primary">
                <Video />
              </EmptyMedia>
              <EmptyTitle>No videos yet</EmptyTitle>
              <EmptyDescription>
                {canEdit ? "Add a recording of the session, then sync it to each game." : "Videos appear here once someone adds them."}
              </EmptyDescription>
            </EmptyHeader>
            {canEdit && (
              <Button onClick={() => setAdding({ game: null })}>
                <Plus /> Add video
              </Button>
            )}
          </Empty>
        ) : (
          <>
            {/* The poster, or the player once something plays. It stays in view while you scroll the list. */}
            <div className={cn("-mx-4 -mt-3 px-4 pt-3", playingItem && "sticky top-14 z-10 bg-background pb-3")}>
              {playingItem && playable ? (
                <VideoPlayer playable={playable} title={playingItem.video.label} />
              ) : (
                <VideoThumb video={featured?.item.video} mark={featured && markOf(featured.game)} className="rounded-2xl">
                  {featured && (
                    <button
                      type="button"
                      onClick={() => play(featured.item)}
                      aria-label={`Play ${featured.item.video.label}`}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="flex size-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                        <Play className="size-8 fill-current" />
                      </span>
                    </button>
                  )}
                </VideoThumb>
              )}
            </div>

            <section aria-label="Session" className="flex flex-col gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{playingItem ? playingItem.video.label : sessionLabel}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {playingItem && playingGame ? (
                    <>
                      {playingGame.name}
                      {playingGame.result && (
                        <>
                          {" · "}
                          <span className="score">{playingGame.result}</span>
                        </>
                      )}
                    </>
                  ) : (
                    `${plural(games.length, "game")} · ${plural(videoCount, "video")}`
                  )}
                </p>
              </div>
              {playingItem ? (
                <div className="flex gap-2">
                  {nextItem && (
                    <Button size="lg" className="flex-1" onClick={() => play(nextItem)}>
                      <SkipForward className="fill-current" /> Next game
                    </Button>
                  )}
                  <Button asChild size="lg" variant="secondary" className={nextItem ? undefined : "flex-1"}>
                    <a href={openUrl(playingItem.video.videoUrl, playingItem.canonicalOffset)} target="_blank" rel="noreferrer">
                      <ExternalLink /> Open in a new tab
                    </a>
                  </Button>
                </div>
              ) : (
                featured && (
                  <Button size="lg" onClick={() => play(featured.item)}>
                    <Play className="fill-current" /> Watch
                  </Button>
                )
              )}
              {unsynced.length > 0 && (
                <button
                  type="button"
                  onClick={() => firstId && document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="pressable self-start text-sm font-medium text-accent-foreground"
                >
                  {unsynced.length} {unsynced.length === 1 ? "video needs" : "videos need"} syncing
                </button>
              )}
            </section>

            <ul aria-label="Games" className="flex flex-col gap-4">
              {shown.map((game) => {
                const inGame = videosOf(game.id);
                const item = inGame[0];
                return item ? (
                  <GameRow
                    key={game.id}
                    game={game}
                    item={item}
                    angles={inGame.length}
                    playing={isPlaying(item)}
                    canEdit={canEdit}
                    highlightId={idFor(item)}
                    onPlay={() => play(item)}
                    onSync={() => openSync(item)}
                    onRemove={() => remove(item, "Removed from game")}
                  />
                ) : (
                  <EmptyGameRow key={game.id} game={game} canEdit={canEdit} onAdd={() => setPicking({ kind: "video", game: { value: game.id, label: game.name } })} />
                );
              })}
            </ul>

            {unassigned.length > 0 && (
              <section aria-label="Not linked to a game" className="flex flex-col gap-2">
                <h2 className="section-label">Not linked to a game</h2>
                <ul className="group-list">
                  {unassigned.map((item) => (
                    <UnlinkedRow
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
          </>
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
        title={picking?.kind === "game" ? "Link to a game" : "Add video"}
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
