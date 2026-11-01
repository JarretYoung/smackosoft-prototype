"use client";

import { z } from "zod";
import { useAppForm } from "@/src/hooks/use-app-form";

/** What the form asks for. */
export type FormVideo = { label: string; videoUrl: string; thumbnailUrl: string | null };

/** What gets saved: the form's answers plus the length, which the app reads from the player. Null when not known. */
export type NewVideo = FormVideo & { durationSeconds: number | null };

const BAD_LINK = "Paste a full link, starting with https://";

function isWebLink(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const addVideoSchema = z.object({
  label: z.string().trim().min(1, "Give the video a name"),
  videoUrl: z.string().trim().min(1, "Paste the link to the video").refine(isWebLink, BAD_LINK),
  thumbnailUrl: z.string().refine((value) => value.trim() === "" || isWebLink(value.trim()), BAD_LINK),
});

/** The parent runs the save, so this form only hands over a clean video and waits on `pending`. */
export function useAddVideoForm({ pending, onAdd }: { pending: boolean; onAdd: (video: FormVideo) => void }) {
  return useAppForm({
    defaultValues: { label: "", videoUrl: "", thumbnailUrl: "" },
    schema: addVideoSchema,
    submit: (values) => {
      if (pending) return;
      onAdd({
        label: values.label.trim(),
        videoUrl: values.videoUrl.trim(),
        thumbnailUrl: values.thumbnailUrl.trim() === "" ? null : values.thumbnailUrl.trim(),
      });
    },
  });
}
