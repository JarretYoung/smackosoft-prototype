import type { Playable } from "@/src/features/videos/player";

/**
 * Plays a link in the page. Only YouTube today, as an iframe, so the controls are YouTube's.
 * It restarts when the source changes, which is how a new game or sync point takes effect.
 */
export function VideoPlayer({ playable, title }: { playable: Playable; title: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <iframe
        key={playable.src}
        src={playable.src}
        title={title}
        className="absolute inset-0 size-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
