"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCurrentAccount } from "@/src/app/actions";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { SaveCurrentAccountInput } from "@/src/contract";
import { errorMessage, fieldErrors } from "@/src/lib/errors";

/** Edit your name and handle. A handle can change a few times in total, so the form says how many are left. */
export function ProfileForm({
  displayName,
  handle,
  changesLeft,
}: {
  displayName: string;
  handle: string;
  changesLeft: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [nextHandle, setNextHandle] = useState(handle);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const handleChanged = nextHandle.trim().toLowerCase() !== handle;
  const dirty = name.trim() !== displayName || handleChanged;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { displayName: name, handle: nextHandle.trim().toLowerCase() };
    const checked = SaveCurrentAccountInput.safeParse(input);
    if (!checked.success) {
      setErrors(Object.fromEntries(checked.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    start(async () => {
      const result = await saveCurrentAccount(input);
      if (!result.ok) {
        setErrors(fieldErrors(result.error));
        if (!Object.keys(fieldErrors(result.error)).length) toast.error(errorMessage(result.error));
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-3xl bg-card p-4 shadow-card">
        <FieldGroup>
          <Field data-invalid={!!errors.displayName}>
            <FieldLabel htmlFor="name">Display name</FieldLabel>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.displayName} />
            <FieldError>{errors.displayName}</FieldError>
          </Field>
          <Field data-invalid={!!errors.handle} data-disabled={changesLeft === 0}>
            <FieldLabel htmlFor="handle">Handle</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-muted-foreground">@</span>
              <Input
                id="handle"
                value={nextHandle}
                autoCapitalize="none"
                disabled={changesLeft === 0}
                onChange={(e) => setNextHandle(e.target.value)}
                aria-invalid={!!errors.handle}
              />
            </div>
            <FieldDescription>
              {changesLeft === 0
                ? "You have used all your handle changes."
                : `You can change your handle ${changesLeft} more ${changesLeft === 1 ? "time" : "times"}.`}
            </FieldDescription>
            <FieldError>{errors.handle}</FieldError>
          </Field>
        </FieldGroup>
      </div>
      <Button type="submit" size="lg" disabled={pending || !dirty}>
        {pending && <Spinner />}
        {pending ? "Saving" : "Save changes"}
      </Button>
    </form>
  );
}
