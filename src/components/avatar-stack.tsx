import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";

type Person = { id: string; displayName: string; avatarUrl: string | null };

// One lightness and chroma, six hues: distinct enough to tell people apart, calm enough to sit
// beside the red accent. Dark text on each passes 4.5:1.
const TONES = [
  "bg-[oklch(0.88_0.07_20)] text-[oklch(0.34_0.1_20)]",
  "bg-[oklch(0.9_0.08_85)] text-[oklch(0.36_0.08_85)]",
  "bg-[oklch(0.88_0.08_150)] text-[oklch(0.32_0.08_150)]",
  "bg-[oklch(0.89_0.06_205)] text-[oklch(0.33_0.07_205)]",
  "bg-[oklch(0.88_0.07_265)] text-[oklch(0.34_0.1_265)]",
  "bg-[oklch(0.88_0.08_320)] text-[oklch(0.34_0.1_320)]",
];

function toneFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

const initials = (name: string) =>
  name
    .replace(/^\(.*?\)\s*/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

/** sm (32) is the one size for rows and stacks. lg (48) and xl (80) are for who someone is: the Home greeting, the score hero, the profile. */
const SIZES = {
  sm: { box: "size-8", text: "text-xs", overlap: "-space-x-2" },
  lg: { box: "size-12", text: "text-base", overlap: "-space-x-3" },
  xl: { box: "size-20", text: "text-2xl", overlap: "-space-x-5" },
} as const;

export type AvatarSize = keyof typeof SIZES;

export function PersonAvatar({
  person,
  size = "sm",
  className,
}: {
  person: Person;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZES[size].box, "ring-2 ring-card", className)}>
      {/* No referrer: Google's image host can refuse requests that carry one. */}
      {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn(SIZES[size].text, "font-semibold", toneFor(person.id))}>
        {initials(person.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Overlapping avatars with a quiet "+N" chip for the rest. */
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
  className,
  ringClassName = "ring-card",
}: {
  people: Person[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  /** The ring is the gap between avatars, so it must match the surface behind them. */
  ringClassName?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const { box, text, overlap } = SIZES[size];
  return (
    <div className={cn("flex shrink-0 items-center", overlap, className)}>
      {shown.map((person) => (
        <PersonAvatar key={person.id} person={person} size={size} className={ringClassName} />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "z-10 flex items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-2 tabular-nums",
            box,
            text,
            ringClassName,
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
