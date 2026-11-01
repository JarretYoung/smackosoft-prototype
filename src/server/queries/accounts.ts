/** Account columns and the row mapper shared by every feature that returns accounts. */
import type { Account } from "../../contract";

type AccountRow = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  account_type: "GUEST" | "STANDARD";
};

export const accountColumns = [
  "accounts.id",
  "accounts.display_name",
  "accounts.handle",
  "accounts.avatar_url",
  "accounts.account_type",
] as const;

export const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  displayName: row.display_name,
  handle: row.handle,
  avatarUrl: row.avatar_url,
  isGuest: row.account_type === "GUEST",
});
