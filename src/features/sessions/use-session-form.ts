"use client";

import { useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGuests } from "@/src/features/accounts/actions";
import { removeMembers, saveMembers, saveSessions } from "@/src/features/sessions/actions";
import { membersReducer, planMembers, type MembersAction } from "@/src/features/sessions/members-draft";
import { sessionTimes } from "@/src/features/sessions/session-times";
import {
  isDirty,
  samePin,
  sessionSchema,
  toSessionSave,
  toValues,
  type SessionFormInitial,
  type SessionValues,
} from "@/src/features/sessions/session-values";
import { useMapsPlace } from "@/src/features/sessions/use-maps-place";
import { ok, type Result, type Role } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { useAppForm } from "@/src/hooks/use-app-form";

/**
 * Form state for creating or editing a session and its members. Everything is staged here.
 * Save runs the writes in order: session, guests, members. Each write is replay safe,
 * so a failed save can simply be tried again.
 * `zoned` is false until the browser has taken over from the server, because the times are the
 * browser's local time. The caller recreates the form when it turns true.
 */
export function useSessionForm({
  mode,
  initial,
  viewerRole,
  zoned,
}: {
  mode: "create" | "edit";
  initial: SessionFormInitial;
  viewerRole: Role;
  zoned: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toValues(initial, zoned));
  const [navigating, startNavigation] = useTransition();
  const schema = useMemo(() => sessionSchema(initial.id), [initial.id]);

  const app = useAppForm({
    defaultValues: saved,
    schema,
    unsaved: isDirty,
    submit: async (values): Promise<Result<null>> => {
      const session = await saveSessions([toSessionSave(values, initial.id, place.pin)]);
      if (!session.ok) return session;

      const plan = planMembers(initial.members, values.members, initial.id);
      if (plan.newGuests.length) {
        const guests = await saveGuests(plan.newGuests);
        if (!guests.ok) return guests;
      }
      if (plan.toSave.length) {
        const members = await saveMembers(plan.toSave);
        if (!members.ok) return members;
      }
      if (plan.toRemove.length) {
        const removed = await removeMembers(plan.toRemove);
        if (!removed.ok) return removed;
      }
      return ok(null);
    },
    onSuccess: (_data, { values, reset }) => {
      // The saved values are the new baseline, so leaving the page does not ask about discarding.
      setSaved(values);
      reset(values);
      toast.success(mode === "create" ? "Session created" : "Session saved");
      startNavigation(() => router.replace(`/sessions/${initial.id}`));
    },
    serverFields: [],
    unmatched: (error) => toast.error(errorMessage(error)),
  });

  const values: SessionValues = useStore(app.form.store, (state) => state.values);
  const place = useMapsPlace(values.locationUrl, values.location, initial);
  const times = sessionTimes(values.date, values.startTime, values.endTime);

  const busy = app.pending || navigating;
  /** An edit has nothing to save until something changed. A pin found from the link counts as a change. */
  const saveDisabled = busy || (mode === "edit" && !app.dirty && samePin(place.pin, initial));

  const changeMembers = (action: MembersAction) =>
    app.form.setFieldValue("members", (list) => membersReducer(list, action));

  return {
    ...app,
    mode,
    values,
    place,
    times,
    busy,
    saveDisabled,
    changeMembers,
    canGrantManager: viewerRole === "OWNER",
  };
}

export type SessionFormState = ReturnType<typeof useSessionForm>;
