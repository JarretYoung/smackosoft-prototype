import { requireSession } from "@/src/lib/dal";
import { PlaceholderPage } from "@/src/components/placeholder-page";

// No data of its own yet, so it gates explicitly. Once this page fetches
// something, `getAuthedClient()` carries the check and this line goes away.
export default async function FriendsPage() {
  await requireSession();

  return <PlaceholderPage title="Friends" />;
}
