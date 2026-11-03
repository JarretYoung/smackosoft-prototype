import { PageHeader } from "@/src/components/page-header";
import { ImportFlow } from "@/src/features/imports/import-flow";
import { loadPeople } from "@/src/features/sessions/people";

export default async function ImportPage() {
  // Teammates and guests, so most names link to someone with one tap.
  const known = await loadPeople();
  return (
    <main>
      <PageHeader title="Import games" back="/sessions" />
      <ImportFlow known={known} />
    </main>
  );
}
