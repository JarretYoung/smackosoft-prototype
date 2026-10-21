import type { Role } from "@/src/contract";

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, MANAGER: 2, OWNER: 3 };

/**
 * For hiding controls only. The backend decides what is allowed.
 * Showing a button the backend would refuse is a UX bug, never a security one.
 */
export const can = (role: Role, min: Role) => RANK[role] >= RANK[min];
