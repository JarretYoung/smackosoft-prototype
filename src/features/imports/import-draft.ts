import type { Choice } from "@/src/features/imports/import-input";

/**
 * An import in progress, kept in this browser so a person can leave and carry on. It holds what cannot be worked out
 * again: the files, who each name is, which names were asked about, and the zone. The preview and counts are
 * worked out from those. It is per signed in person. Nothing leaves the browser.
 */
export type Draft = {
  files: { name: string; text: string }[];
  choices: Record<string, Choice>;
  asked: string[];
  zone: string;
  /** Where to open. The check is not kept, it opens the step before it. */
  step: "file" | "people";
};

const keyOf = (viewerId: string) => `import-draft:${viewerId}`;

const isDraft = (value: unknown): value is Draft => {
  const draft = value as Draft | null;
  return (
    !!draft &&
    Array.isArray(draft.files) &&
    draft.files.every((file) => typeof file?.name === "string" && typeof file?.text === "string") &&
    typeof draft.choices === "object" &&
    Array.isArray(draft.asked) &&
    typeof draft.zone === "string" &&
    (draft.step === "file" || draft.step === "people")
  );
};

/** The saved draft as stored, or null when there is none or the browser cannot say. Text, so it can be read as a stable snapshot. */
export function draftText(viewerId: string): string | null {
  try {
    return localStorage.getItem(keyOf(viewerId));
  } catch {
    return null;
  }
}

/** The draft in stored text, or null when it is missing or not a draft. */
export function parseDraft(text: string | null): Draft | null {
  try {
    const parsed: unknown = text ? JSON.parse(text) : null;
    return isDraft(parsed) && parsed.files.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(viewerId: string, draft: Draft) {
  try {
    localStorage.setItem(keyOf(viewerId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked. The import still works, it just cannot be picked up later.
  }
}

export function clearDraft(viewerId: string) {
  try {
    localStorage.removeItem(keyOf(viewerId));
  } catch {
    // Nothing to clear if the browser will not say.
  }
}
