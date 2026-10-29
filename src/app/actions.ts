"use server";

/**
 * Thin server actions over the backend. Each one runs the write, then refreshes every page
 * so the next read is fresh. The contract does the validation and the authorization.
 */
import { revalidatePath } from "next/cache";
import type {
  Ack,
  ClaimInput,
  CreateClaimInput,
  RemoveGuestsInput,
  FindAccountByHandleInput,
  RemoveGameScoresInput,
  RemoveGamesInput,
  RemoveMatchesInput,
  RemoveMatchPlayersInput,
  RemoveMembersInput,
  RemoveSessionsInput,
  RemoveVideoLinkagesInput,
  SaveCurrentAccountInput,
  SaveGameScoresInput,
  SaveGamesInput,
  SaveGuestsInput,
  SaveMatchesInput,
  SaveMatchPlayersInput,
  SaveMembersInput,
  SaveSessionsInput,
  SaveTeamsInput,
  SaveVideoLinkagesInput,
  SaveVideosInput,
} from "@/src/contract";
import { backend } from "@/src/server";

async function refreshed(write: Promise<Ack>): Promise<Ack> {
  const result = await write;
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function saveCurrentAccount(input: SaveCurrentAccountInput) {
  return refreshed(backend.accounts.saveCurrent(input));
}
export async function saveGuests(input: SaveGuestsInput) {
  return refreshed(backend.accounts.saveGuests(input));
}
export async function removeGuests(input: RemoveGuestsInput) {
  return refreshed(backend.accounts.removeGuests(input));
}
export async function createClaim(input: CreateClaimInput) {
  const result = await backend.accounts.createClaim(input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
export async function claimGuest(input: ClaimInput) {
  return refreshed(backend.accounts.claim(input));
}
export async function findAccountByHandle(input: FindAccountByHandleInput) {
  return backend.accounts.findByHandle(input);
}
export async function isHandleFree(input: FindAccountByHandleInput) {
  return backend.accounts.isHandleFree(input);
}

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

export async function saveMatches(input: SaveMatchesInput) {
  return refreshed(backend.matches.save(input));
}
export async function removeMatches(input: RemoveMatchesInput) {
  return refreshed(backend.matches.remove(input));
}
export async function saveTeams(input: SaveTeamsInput) {
  return refreshed(backend.matches.saveTeams(input));
}
export async function savePlayers(input: SaveMatchPlayersInput) {
  return refreshed(backend.matches.savePlayers(input));
}
export async function removePlayers(input: RemoveMatchPlayersInput) {
  return refreshed(backend.matches.removePlayers(input));
}
export async function saveGames(input: SaveGamesInput) {
  return refreshed(backend.matches.saveGames(input));
}
export async function removeGames(input: RemoveGamesInput) {
  return refreshed(backend.matches.removeGames(input));
}
export async function removeScores(input: RemoveGameScoresInput) {
  return refreshed(backend.matches.removeScores(input));
}
export async function saveScores(input: SaveGameScoresInput) {
  return refreshed(backend.matches.saveScores(input));
}

export async function saveVideos(input: SaveVideosInput) {
  return refreshed(backend.videos.save(input));
}
export async function saveLinkages(input: SaveVideoLinkagesInput) {
  return refreshed(backend.videos.saveLinkages(input));
}
export async function removeLinkages(input: RemoveVideoLinkagesInput) {
  return refreshed(backend.videos.removeLinkages(input));
}
