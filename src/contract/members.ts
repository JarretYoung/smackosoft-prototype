import { z } from "zod";
import type { Account } from "./accounts";
import { batch, GrantableRole, Role, UUID } from "./common";
import type { Ack } from "./result";

// ------------------------------------------------------------------ inputs

export const MemberSave = z.object({
  sessionId: UUID,
  accountId: UUID,
  role: GrantableRole,
});
export const SaveMembersInput = batch(MemberSave, (m) => `${m.sessionId}:${m.accountId}`);
export type SaveMembersInput = z.input<typeof SaveMembersInput>;

export const MemberKey = z.object({ sessionId: UUID, accountId: UUID });
export const RemoveMembersInput = batch(MemberKey, (m) => `${m.sessionId}:${m.accountId}`);
export type RemoveMembersInput = z.input<typeof RemoveMembersInput>;

// ----------------------------------------------------------------- outputs

export type Member = Account & {
  role: Role;
  /** True when the account plays in at least one match of this session. */
  isPlayer: boolean;
};

// --------------------------------------------------------------- interface

export interface MembersApi {
  save(input: SaveMembersInput): Promise<Ack>;
  /** Fails with CONFLICT while the account is still a player in the session. */
  remove(input: RemoveMembersInput): Promise<Ack>;
}
