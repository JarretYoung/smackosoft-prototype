import { z } from "zod";
import { AccountHandle, batch, UUID } from "./common";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

export const FindAccountByHandleInput = z.object({ handle: z.string() });
export type FindAccountByHandleInput = z.input<typeof FindAccountByHandleInput>;

/** The actor's own account is a singleton, so this takes one object, not an array. */
export const SaveCurrentAccountInput = z.object({
  displayName: z.string().trim().min(1),
  handle: AccountHandle,
});
export type SaveCurrentAccountInput = z.input<typeof SaveCurrentAccountInput>;

export const GuestSave = z.object({
  id: UUID,
  displayName: z.string().trim().min(1),
  handle: AccountHandle,
});
export const SaveGuestsInput = batch(GuestSave, (g) => g.id);
export type SaveGuestsInput = z.input<typeof SaveGuestsInput>;

// ----------------------------------------------------------------- outputs

export type Account = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isGuest: boolean;
};

export type CurrentAccount = {
  account: Account;
  /** 2 minus handle_change_count. */
  handleChangesLeft: number;
};

// --------------------------------------------------------------- interface

export interface AccountsApi {
  /** UNAUTHENTICATED without a session or an account. A session without an account means onboarding. */
  getCurrent(): Promise<Result<CurrentAccount>>;
  /**
   * Onboarding and profile edit. Creates the account on first call, updates it later.
   * A changed handle counts against the two allowed changes. Saving the same handle does not.
   */
  saveCurrent(input: SaveCurrentAccountInput): Promise<Ack>;
  /** Data is null when no account has that handle. */
  findByHandle(input: FindAccountByHandleInput): Promise<Result<Account | null>>;
  saveGuests(input: SaveGuestsInput): Promise<Ack>;
}
