"use server";

import type {
  RemoveVideoGamesInput,
  RemoveVideoSessionsInput,
  SaveVideoGamesInput,
  SaveVideoSessionsInput,
  SaveVideosInput,
} from "@/src/contract";
import { backend } from "@/src/server";
import { refreshed } from "../refreshed";

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
