import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";

type Person = { id: string; displayName: string; avatarUrl: string | null };

// Soft tones in the same family as the mockups.
const TONES = [
  "bg-rose-300 text-rose-950",
  "bg-teal-300 text-teal-950",
  "bg-amber-200 text-amber-950",
  "bg-fuchsia-300 text-fuchsia-950",
  "bg-sky-300 text-sky-950",
  "bg-lime-300 text-lime-950",
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
    <Avatar className={cn("size-8 ring-2 ring-card", className)}>
      {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
      <AvatarFallback className={cn("text-[11px] font-semibold", toneFor(person.id))}>
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
        <span className="z-10 flex size-8 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  );
}
