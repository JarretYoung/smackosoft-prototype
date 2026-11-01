import type { MatchFormat, MatchType } from "@/src/contract";

/** How many games a match holds, in words a player uses. Show these, never the code. */
export const MATCH_FORMAT_LABEL: Record<MatchFormat, string> = {
  BO1: "Best of 1",
  BO3: "Best of 3",
  BO5: "Best of 5",
  FREE: "Free format",
};

/** What each match type code means, in words a player uses. Show these, never the code. */
export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  MS: "Men's singles",
  WS: "Women's singles",
  XS: "Mixed singles",
  MD: "Men's doubles",
  WD: "Women's doubles",
  XD: "Mixed doubles",
  PRACTICE: "Practice",
  OTHER: "Other",
};
