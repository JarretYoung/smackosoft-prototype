import { PersonAvatar } from "@/src/components/avatar-stack";
import { GuestsPanel } from "@/src/components/profile/guests-panel";
import { ProfileForm } from "@/src/components/profile/profile-form";
import { LogoutButton } from "@/src/components/logout-button";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

export default async function ProfilePage() {
  const me = unwrap(await backend.accounts.getCurrent());
  const guests = unwrap(await backend.accounts.listGuests());

  return (
    <main className="space-y-8 px-5 pb-6 pt-8">
      <header className="flex items-center gap-4">
        <PersonAvatar person={me.account} className="size-16 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{me.account.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{me.account.handle}</p>
        </div>
        <LogoutButton />
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Your details</h2>
        {/* Keyed by the saved values so the form resets after a save. */}
        <ProfileForm
          key={`${me.account.displayName}:${me.account.handle}`}
          displayName={me.account.displayName}
          handle={me.account.handle}
          changesLeft={me.handleChangesLeft}
        />
      </section>

      <GuestsPanel guests={guests} />
    </main>
  );
}
