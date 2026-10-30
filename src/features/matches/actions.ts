"use server";

import type {
  RemoveGameScoresInput,
  RemoveGamesInput,
  RemoveMatchesInput,
  RemoveMatchPlayersInput,
  SaveGameScoresInput,
  SaveGamesInput,
  SaveMatchesInput,
  SaveMatchPlayersInput,
  SaveTeamsInput,
} from "@/src/contract";
import { backend } from "@/src/server";
import { refreshed } from "../refreshed";

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
