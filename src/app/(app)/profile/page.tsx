import { PersonAvatar } from "@/src/components/avatar-stack";
import { FileUp } from "lucide-react";
import { RowChevron } from "@/src/components/row-chevron";
import { GuestsPanel } from "@/src/features/profile/guests-panel";
import { ProfileForm } from "@/src/features/profile/profile-form";
import { LogoutButton } from "@/src/features/auth/logout-button";
import { LeaveLink } from "@/src/hooks/unsaved-changes";
import { SignInMethods } from "@/src/features/profile/sign-in-methods";
import { unwrap } from "@/src/lib/result";
import { getClaims } from "@/src/lib/supabase/server";
import { backend } from "@/src/server";

// The tab bar links here with `prefetch`, a full prefetch that brings the data along. Next calls
// that the legacy mode and asks the target route to say it is meant (see docs/architecture.md).
export const instant = false;

export default async function ProfilePage() {
  // The sign in methods come from the verified token, so this costs no extra request.
  const [meResult, guestsResult, claims] = await Promise.all([
    backend.accounts.getCurrent(),
    backend.accounts.listGuests(),
    getClaims(),
  ]);
  const me = unwrap(meResult);
  const guests = unwrap(guestsResult);
  const providers = Array.isArray(claims?.app_metadata?.providers) ? (claims.app_metadata.providers as string[]) : [];

  return (
    <main className="flex flex-col gap-7 px-4 pt-6 pb-4">
      <header className="flex items-center gap-4 px-1">
        <PersonAvatar person={me.account} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.75rem] leading-tight font-bold tracking-tight">{me.account.displayName}</h1>
          <p className="text-subhead text-muted-foreground">@{me.account.handle}</p>
        </div>
      </header>

      <section aria-labelledby="details-heading" className="flex flex-col gap-2">
        <h2 id="details-heading" className="section-label">
          Your details
        </h2>
        {/* Keyed by the saved values so the form resets after a save. */}
        <ProfileForm
          key={`${me.account.displayName}:${me.account.handle}`}
          displayName={me.account.displayName}
          handle={me.account.handle}
          changesLeft={me.handleChangesLeft}
        />
      </section>

      <SignInMethods email={claims?.email ?? null} providers={providers} />

      <GuestsPanel guests={guests} />

      <section aria-labelledby="import-heading" className="flex flex-col gap-2">
        <h2 id="import-heading" className="section-label">
          Bring in your games
        </h2>
        <div className="group-list">
          <LeaveLink href="/import" className="pressable-row list-row">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileUp className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Import games</span>
              <span className="block truncate text-sm text-muted-foreground">From a file of games and video links</span>
            </span>
            <RowChevron />
          </LeaveLink>
        </div>
      </section>

      <LogoutButton />
    </main>
  );
}
