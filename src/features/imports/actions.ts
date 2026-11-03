"use server";

import type { ImportGamesInput } from "@/src/contract";
import { backend } from "@/src/server";
import { refreshed } from "../refreshed";

/** A dry run keeps nothing, so it does not refresh the pages. */
export async function importGames(input: ImportGamesInput) {
  return input.dryRun ? backend.imports.games(input) : refreshed(backend.imports.games(input));
}
