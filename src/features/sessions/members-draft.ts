import type { Account, GrantableRole, Role } from "../../contract";

export type MemberDraft = {
  account: Account;
  role: Role;
  isPlayer: boolean;
  /** A guest that must be created before it can be added. */
  newGuest: boolean;
};

/** A guest that does not exist yet. It is created when the session is saved. */
export type NewGuest = Account & { isNew: true };

export type MembersAction =
  | { type: "add"; accounts: (Account | NewGuest)[] }
  | { type: "role"; id: string; role: Role }
  | { type: "remove"; id: string };

/** The staged member list. The owner never changes, and a person is never listed twice. */
export function membersReducer(list: MemberDraft[], action: MembersAction): MemberDraft[] {
  switch (action.type) {
    case "add": {
      const known = new Set(list.map((m) => m.account.id));
      const fresh = action.accounts.filter((account, i) => {
        if (known.has(account.id)) return false;
        return action.accounts.findIndex((other) => other.id === account.id) === i;
      });
      return [
        ...list,
        ...fresh.map((account) => ({ account, role: "VIEWER" as Role, isPlayer: false, newGuest: "isNew" in account })),
      ];
    }
    case "role":
      return list.map((m) => (m.account.id === action.id && m.role !== "OWNER" ? { ...m, role: action.role } : m));
    case "remove":
      return list.filter((m) => m.account.id !== action.id || m.role === "OWNER");
  }
}

/** The writes that turn the saved members into the staged ones. Each is replay safe. */
export function planMembers(saved: MemberDraft[], staged: MemberDraft[], sessionId: string) {
  const before = new Map(saved.map((m) => [m.account.id, m]));
  const wanted = new Set(staged.map((m) => m.account.id));
  return {
    newGuests: staged
      .filter((m) => m.newGuest)
      .map((m) => ({ id: m.account.id, displayName: m.account.displayName, handle: m.account.handle })),
    toSave: staged
      .filter((m) => m.role !== "OWNER" && before.get(m.account.id)?.role !== m.role)
      .map((m) => ({ sessionId, accountId: m.account.id, role: m.role as GrantableRole })),
    toRemove: saved
      .filter((m) => m.role !== "OWNER" && !wanted.has(m.account.id))
      .map((m) => ({ sessionId, accountId: m.account.id })),
  };
}

/** True when the staged members differ from the saved ones in who is in or what role they have. */
export function membersChanged(saved: MemberDraft[], staged: MemberDraft[]): boolean {
  return (
    saved.length !== staged.length || staged.some((m) => saved.find((s) => s.account.id === m.account.id)?.role !== m.role)
  );
}
