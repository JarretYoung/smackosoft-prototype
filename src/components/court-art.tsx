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

/** A stand-in for the court photo: a deep green court with chalk lines, seen from above. */
export function CourtArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-ink", className)} aria-hidden>
      <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="court-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.42 0.09 160)" />
            <stop offset="1" stopColor="oklch(0.3 0.07 165)" />
          </linearGradient>
        </defs>
        <rect width="200" height="110" fill="url(#court-fill)" />
        <g fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1">
          <rect x="14" y="10" width="172" height="90" />
          <line x1="100" y1="10" x2="100" y2="100" strokeWidth="1.8" strokeOpacity="0.8" />
          <line x1="14" y1="24" x2="186" y2="24" />
          <line x1="14" y1="86" x2="186" y2="86" />
          <line x1="58" y1="10" x2="58" y2="100" />
          <line x1="142" y1="10" x2="142" y2="100" />
          <line x1="58" y1="55" x2="14" y2="55" />
          <line x1="142" y1="55" x2="186" y2="55" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
