import { z } from "zod";
import { AccountHandle, batch, UUID } from "./common";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

export const FindAccountByHandleInput = z.object({ handle: z.string() });
export type FindAccountByHandleInput = z.input<typeof FindAccountByHandleInput>;

/**
 * A profile picture from Google. Only https links on Google's image hosts, so a user cannot
 * point their avatar at any server they like (user metadata in Supabase is editable by the user).
 */
export const AvatarUrl = z
  .url({ protocol: /^https$/ })
  .max(500)
  .refine((value) => new URL(value).hostname.endsWith(".googleusercontent.com"), "Not a Google image link");

/** The actor's own account is a singleton, so this takes one object, not an array. */
export const SaveCurrentAccountInput = z.object({
  displayName: z.string().trim().min(1),
  handle: AccountHandle,
  /** Used only when the account is created. Later calls leave the picture alone. */
  avatarUrl: AvatarUrl.nullish(),
});
export type SaveCurrentAccountInput = z.input<typeof SaveCurrentAccountInput>;

export const RemoveGuestsInput = batch(UUID, (id) => id);
export type RemoveGuestsInput = z.input<typeof RemoveGuestsInput>;

export const CreateClaimInput = z.object({ guestId: UUID });
export type CreateClaimInput = z.input<typeof CreateClaimInput>;

export const ClaimInput = z.object({ token: z.string().trim().min(8) });
export type ClaimInput = z.input<typeof ClaimInput>;

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

/** A guest the actor created. */
export type Guest = Account & {
  /** True while a claim code is waiting to be used. */
  hasClaimCode: boolean;
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
  /**
   * True when nobody else holds the handle. The caller's own handle counts as free.
   * Works before onboarding, so the first form can check a handle as it is typed.
   */
  isHandleFree(input: FindAccountByHandleInput): Promise<Result<boolean>>;
  saveGuests(input: SaveGuestsInput): Promise<Ack>;
  /** Guests the actor created and has not removed. */
  listGuests(): Promise<Result<Guest[]>>;
  /** Soft delete. Past matches keep the guest. The handle becomes free. Only the creator can remove a guest. */
  removeGuests(input: RemoveGuestsInput): Promise<Ack>;
  /** Makes a new code for a guest the actor created. The old code stops working. */
  createClaim(input: CreateClaimInput): Promise<Result<{ token: string }>>;
  /**
   * Turns a guest into the signed-in user's own account, with all its history.
   * Only for someone with no account yet. Works without an account, like saveCurrent.
   */
  claim(input: ClaimInput): Promise<Ack>;
}
