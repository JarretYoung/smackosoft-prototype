import { formatOffset, OFFSET_LIMIT, parseOffset, roundOffset } from "./offset";

/** The sync point twice over: the number the ruler shows, and the text in the box, which can be mid-typing. */
export type SyncState = { value: number; draft: string };

export type SyncAction =
  /** The ruler, a step button or the player moved the point. Clamped and kept to the millisecond, and the text follows. */
  | { type: "set"; seconds: number }
  /** The person typed. The number follows only while the text is a valid time. */
  | { type: "type"; text: string }
  /** The box lost focus. Tidy the text back to the number. */
  | { type: "blur" };

export function startSync(offset: number | null): SyncState {
  const value = offset ?? 0;
  return { value, draft: formatOffset(value) };
}

export function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "set": {
      const value = roundOffset(Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, action.seconds)));
      return { value, draft: formatOffset(value) };
    }
    case "type": {
      const parsed = parseOffset(action.text);
      return { value: parsed ?? state.value, draft: action.text };
    }
    case "blur":
      return { ...state, draft: formatOffset(state.value) };
  }
}

/** False while the text is not a time. Saving waits. */
export const isSyncValid = (state: SyncState): boolean => parseOffset(state.draft) !== null;
