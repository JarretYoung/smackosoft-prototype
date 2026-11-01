"use client";

import { useReducer, type FormEvent } from "react";
import { isSyncValid, startSync, syncReducer } from "@/src/features/videos/sync-offset";

/**
 * State for the sync sheet. The ruler, the plus and minus buttons and the text box all edit
 * one sync point, so they share a reducer. The parent saves, so `pending` comes from outside.
 */
export function useSyncForm({
  offset,
  pending,
  save,
}: {
  /** The saved sync point, or null when the video is not synced yet. */
  offset: number | null;
  pending: boolean;
  /** Null clears the sync point. */
  save: (offset: number | null) => void;
}) {
  const [state, dispatch] = useReducer(syncReducer, offset, startSync);
  const valid = isSyncValid(state);

  return {
    value: state.value,
    draft: state.draft,
    valid,
    set: (seconds: number) => dispatch({ type: "set", seconds }),
    type: (text: string) => dispatch({ type: "type", text }),
    tidy: () => dispatch({ type: "blur" }),
    clear: () => save(null),
    onSubmit: (event: FormEvent) => {
      event.preventDefault();
      if (!pending && valid) save(state.value);
    },
  };
}
