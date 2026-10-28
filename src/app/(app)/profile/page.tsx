import { PersonAvatar } from "@/src/components/avatar-stack";
import { GuestsPanel } from "@/src/components/profile/guests-panel";
import { ProfileForm } from "@/src/components/profile/profile-form";
import { LogoutButton } from "@/src/components/logout-button";
import { SignInMethods } from "@/src/components/profile/sign-in-methods";
import { unwrap } from "@/src/lib/result";
import { createClient } from "@/src/lib/supabase/server";
import { backend } from "@/src/server";

export default async function ProfilePage() {
  const me = unwrap(await backend.accounts.getCurrent());
  const guests = unwrap(await backend.accounts.listGuests());

  // The sign in methods come from the verified token, so this costs no extra request.
  const supabase = await createClient();
  const claims = (await supabase.auth.getClaims()).data?.claims;
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

      <LogoutButton />
    </main>
  );
}
