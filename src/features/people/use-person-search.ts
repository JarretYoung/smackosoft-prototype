"use client";

import { useState, useTransition } from "react";
import type { Account } from "@/src/contract";
import { findByHandle } from "@/src/features/accounts/actions";
import { errorMessage } from "@/src/lib/errors";
import { rankPeople, type Findable } from "./search";

/**
 * The search every people picker shares: type a name to narrow the list, type "@handle" to look someone up,
 * or a new name to make a guest. The picker draws the list and decides what picking means.
 * `all` is what can be picked, most likely first.
 */
export function usePersonSearch<T extends Findable>(all: readonly T[]) {
  const [query, setQueryState] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, start] = useTransition();

  const text = query.trim();
  const handle = text.replace(/^@/, "").toLowerCase();
  const matches = rankPeople(all, text);
  const canLookup = /^[a-z0-9_]{3,30}$/.test(handle) && !all.some((p) => p.handle === handle);
  const canMakeGuest = text !== "" && !text.startsWith("@") && !all.some((p) => p.displayName.toLowerCase() === text.toLowerCase());

  function setQuery(value: string) {
    setQueryState(value);
    setLookupError(null);
  }

  /** Finds the person with the typed handle. `onFound` returns a message when that person cannot be used, else null. */
  function lookup(onFound: (account: Account) => string | null) {
    setLookupError(null);
    start(async () => {
      const result = await findByHandle({ handle });
      if (!result.ok) return void setLookupError(errorMessage(result.error));
      if (!result.data) return void setLookupError(`No one has the handle @${handle}`);
      const problem = onFound(result.data);
      if (problem) setLookupError(problem);
      else setQueryState("");
    });
  }

  return { query, setQuery, text, handle, matches, canLookup, canMakeGuest, lookup, looking, lookupError };
}
