"use client";

import type { ComponentType } from "react";
import type { PlayableSource } from "@/src/features/videos/player";
import type { PlayerProps } from "./types";
import { YouTubePlayer } from "./youtube";

export type { MediaHandle, PlayerProps } from "./types";

/** One player per playable source. The type needs an entry for every id in `PLAYABLE_SOURCES`. */
export const PLAYERS: Record<PlayableSource, ComponentType<PlayerProps>> = {
  youtube: YouTubePlayer,
};
