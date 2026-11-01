import type { Role } from "@/src/contract";

export const ROLE_LABEL: Record<Role, string> = { OWNER: "Owner", MANAGER: "Manager", EDITOR: "Editor", VIEWER: "Viewer" };

export const ROLE_CAN: Record<Exclude<Role, "OWNER">, string> = {
  VIEWER: "Can see the session and its videos",
  EDITOR: "Can also edit matches, scores and players",
  MANAGER: "Can also edit the session and manage members",
};
