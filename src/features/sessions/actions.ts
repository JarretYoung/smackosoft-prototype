"use server";

import type { RemoveMembersInput, RemoveSessionsInput, SaveMembersInput, SaveSessionsInput } from "@/src/contract";
import { backend } from "@/src/server";
import { refreshed } from "../refreshed";

export async function saveSessions(input: SaveSessionsInput) {
  return refreshed(backend.sessions.save(input));
}
export async function removeSessions(input: RemoveSessionsInput) {
  return refreshed(backend.sessions.remove(input));
}
export async function saveMembers(input: SaveMembersInput) {
  return refreshed(backend.members.save(input));
}
export async function removeMembers(input: RemoveMembersInput) {
  return refreshed(backend.members.remove(input));
}
