import type { MatchType } from "@/src/contract";

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
