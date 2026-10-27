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

export function PersonAvatar({ person, className }: { person: Person; className?: string }) {
  return (
    <Avatar className={cn("size-9 ring-2 ring-card", className)}>
      {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
      <AvatarFallback className={cn("text-xs font-semibold", toneFor(person.id))}>
        {initials(person.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Overlapping avatars with a "+N" chip for the rest. */
export function AvatarStack({
  people,
  max = 4,
  className,
}: {
  people: Person[];
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((person) => (
        <PersonAvatar key={person.id} person={person} />
      ))}
      {rest > 0 && (
        <span className="z-10 flex size-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  );
}
