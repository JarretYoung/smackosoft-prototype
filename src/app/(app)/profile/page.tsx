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
    <main className="flex flex-col gap-8 px-4 pt-6 pb-4">
      <header className="flex items-center gap-4 px-1">
        <PersonAvatar person={me.account} className="size-20 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.75rem] leading-tight font-bold tracking-tight">{me.account.displayName}</h1>
          <p className="text-[0.9375rem] text-muted-foreground">@{me.account.handle}</p>
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

      <GuestsPanel guests={guests} />

      <LogoutButton />
    </main>
  );
}
