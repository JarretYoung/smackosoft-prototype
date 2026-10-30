export function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-3">
      <dd className="score text-3xl leading-none">{value}</dd>
      <dt className="mt-1 text-sm text-primary-foreground/90">{label}</dt>
    </div>
  );
}
