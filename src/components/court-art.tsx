import { cn } from "@/src/lib/utils";

/** The session cover when it has one, otherwise the drawn court. */
export function SessionCover({ url, className }: { url: string | null; className?: string }) {
  if (!url) return <CourtArt className={className} />;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}

/** Chalk lines of a badminton court, seen from above. Uses the current text color. */
function CourtLines({ className, opacity }: { className?: string; opacity: number }) {
  return (
    <svg
      viewBox="0 0 200 110"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
      stroke="white"
      strokeOpacity={opacity}
      strokeWidth="1"
      aria-hidden
    >
      <rect x="14" y="10" width="172" height="90" />
      <line x1="100" y1="10" x2="100" y2="100" strokeWidth="1.8" strokeOpacity={Math.min(1, opacity * 1.5)} />
      <line x1="14" y1="24" x2="186" y2="24" />
      <line x1="14" y1="86" x2="186" y2="86" />
      <line x1="58" y1="10" x2="58" y2="100" />
      <line x1="142" y1="10" x2="142" y2="100" />
      <line x1="58" y1="55" x2="14" y2="55" />
      <line x1="142" y1="55" x2="186" y2="55" />
    </svg>
  );
}

/** A stand-in for the court photo: the court lines on the brand red. */
export function CourtArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-primary-deep", className)} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.52_0.19_24)] to-primary-deep" />
      <CourtLines className="absolute inset-0 size-full" opacity={0.4} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
