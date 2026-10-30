"use client";

import { toast } from "sonner";
import { z } from "zod";
import { useStore } from "@tanstack/react-form";
import { saveGuests } from "@/src/features/accounts/actions";
import { useAppForm } from "@/src/hooks/use-app-form";
import type { Guest } from "@/src/contract";
import { guestHandle } from "@/src/lib/guest";

const addSchema = z.object({ displayName: z.string().trim().min(1, "Enter a name"), handle: z.string() });
const editSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a name"),
  handle: z.string().trim().min(1, "Enter a handle"),
});

/**
 * Add a guest, or edit one when `guest` is given. Adding asks for a name only and derives the
 * handle from it. A failed save shows under the field that matters most, which is the name
 * when adding and the handle when editing.
 */
export function useGuestForm({ guest, onDone }: { guest?: Guest; onDone: () => void }) {
  const app = useAppForm({
    defaultValues: { displayName: guest?.displayName ?? "", handle: guest?.handle ?? "" },
    schema: guest ? editSchema : addSchema,
    submit: (values) =>
      saveGuests([
        {
          id: guest?.id ?? crypto.randomUUID(),
          displayName: values.displayName.trim(),
          handle: guest ? values.handle.trim().toLowerCase() : guestHandle(values.displayName),
        },
      ]),
    onSuccess: () => {
      toast.success(guest ? "Guest saved" : "Guest added");
      onDone();
    },
    serverFields: [],
    unmatched: guest ? "handle" : "displayName",
  });

  const canSave = useStore(app.form.store, ({ values }) => {
    const name = values.displayName.trim();
    const handle = values.handle.trim();
    if (!guest) return name !== "";
    return name !== "" && handle !== "" && (name !== guest.displayName || handle !== guest.handle);
  });

  return { ...app, canSave };
}
