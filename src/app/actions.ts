"use server";

/**
 * Thin server actions over the backend. Each one runs the write, then refreshes every page
 * so the next read is fresh. The contract does the validation and the authorization.
 */
import { revalidatePath } from "next/cache";
import type {
  Ack,
  ClaimInput,
  CreateClaimCodeInput,
  RemoveGuestsInput,
  FindAccountByHandleInput,
  RemoveGameScoresInput,
  RemoveGamesInput,
  RemoveMatchesInput,
  RemoveMatchPlayersInput,
  RemoveMembersInput,
  RemoveSessionsInput,
  RemoveVideoGamesInput,
  RemoveVideoSessionsInput,
  SaveCurrentAccountInput,
  SaveGameScoresInput,
  SaveGamesInput,
  SaveGuestsInput,
  SaveMatchesInput,
  SaveMatchPlayersInput,
  SaveMembersInput,
  SaveSessionsInput,
  SaveTeamsInput,
  SaveVideoGamesInput,
  SaveVideoSessionsInput,
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
export async function createClaimCode(input: CreateClaimCodeInput) {
  const result = await backend.accounts.createClaimCode(input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
export async function claimGuest(input: ClaimInput) {
  return refreshed(backend.accounts.claim(input));
}
export async function findByHandle(input: FindAccountByHandleInput) {
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
export async function saveMatchPlayers(input: SaveMatchPlayersInput) {
  return refreshed(backend.matches.saveMatchPlayers(input));
}
export async function removeMatchPlayers(input: RemoveMatchPlayersInput) {
  return refreshed(backend.matches.removeMatchPlayers(input));
}
export async function saveGames(input: SaveGamesInput) {
  return refreshed(backend.matches.saveGames(input));
}
export async function removeGames(input: RemoveGamesInput) {
  return refreshed(backend.matches.removeGames(input));
}
export async function removeGameScores(input: RemoveGameScoresInput) {
  return refreshed(backend.matches.removeGameScores(input));
}
export async function saveGameScores(input: SaveGameScoresInput) {
  return refreshed(backend.matches.saveGameScores(input));
}

export async function saveVideos(input: SaveVideosInput) {
  return refreshed(backend.videos.save(input));
}
export async function saveVideoSessions(input: SaveVideoSessionsInput) {
  return refreshed(backend.videos.saveVideoSessions(input));
}
export async function removeVideoSessions(input: RemoveVideoSessionsInput) {
  return refreshed(backend.videos.removeVideoSessions(input));
}
export async function saveVideoGames(input: SaveVideoGamesInput) {
  return refreshed(backend.videos.saveVideoGames(input));
}
export async function removeVideoGames(input: RemoveVideoGamesInput) {
  return refreshed(backend.videos.removeVideoGames(input));
}
