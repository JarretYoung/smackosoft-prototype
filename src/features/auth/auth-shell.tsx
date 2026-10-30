import type { ReactNode } from "react";

/**
 * The entry screen for sign in, sign up and onboarding. A bold red header carries the brand,
 * and the form sits on a white sheet that rises over it.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background md:shadow-float">
      <header className="hero relative overflow-hidden rounded-b-4xl px-6 pt-16 pb-24">
        <div className="flex size-14 items-center justify-center rounded-xl bg-white text-2xl font-bold text-primary shadow-float">
          S
        </div>
        <p className="mt-6 text-[2.5rem] leading-[1.05] font-bold tracking-tight">
          Every point,
          <br />
          on the record.
        </p>
        <p className="mt-2 text-subhead text-primary-foreground/90">Smackosoft keeps your badminton sessions and scores.</p>
      </header>

      <div className="relative -mt-12 flex flex-1 flex-col gap-6 rounded-t-4xl bg-card px-6 pt-8 pb-10 shadow-float">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
          {description && <p className="text-subhead text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
