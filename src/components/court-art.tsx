import { cn } from "@/src/lib/utils";

/** A stand-in for the court photo: a green court with white lines, seen from above. */
export function CourtArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-emerald-700", className)} aria-hidden>
      <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <rect width="200" height="110" fill="#1f6f4f" />
        <g fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1.2">
          <rect x="14" y="10" width="172" height="90" />
          <line x1="100" y1="10" x2="100" y2="100" strokeWidth="2" />
          <line x1="14" y1="24" x2="186" y2="24" />
          <line x1="14" y1="86" x2="186" y2="86" />
          <line x1="58" y1="10" x2="58" y2="100" />
          <line x1="142" y1="10" x2="142" y2="100" />
          <line x1="58" y1="55" x2="14" y2="55" />
          <line x1="142" y1="55" x2="186" y2="55" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}
