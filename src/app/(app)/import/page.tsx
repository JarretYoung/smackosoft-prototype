import { PageHeader } from "@/src/components/page-header";
import { ImportFlow } from "@/src/features/imports/import-flow";
import { loadPeople } from "@/src/features/sessions/people";
import { unwrap } from "@/src/lib/result";
import { backend } from "@/src/server";

export default async function ImportPage() {
  // The viewer first, because a name in the file is often them, then teammates and guests, so most names link with one tap.
  const [mine, people] = await Promise.all([backend.accounts.getCurrent(), loadPeople()]);
  const { id, displayName, handle, avatarUrl, isGuest } = unwrap(mine).account;
  const known = [{ id, displayName, handle, avatarUrl, isGuest }, ...people.filter((p) => p.id !== id)];
  return (
    <main>
      <PageHeader title="Import games" back="/sessions" />
      <ImportFlow known={known} viewerId={id} />
    </main>
  );
}
