"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCurrentAccount } from "@/src/app/actions";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">@</span>
          <Input
            id="handle"
            value={nextHandle}
            autoCapitalize="none"
            disabled={changesLeft === 0}
            onChange={(e) => setNextHandle(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {changesLeft === 0
            ? "You have used all your handle changes."
            : `You can change your handle ${changesLeft} more ${changesLeft === 1 ? "time" : "times"}.`}
        </p>
        {errors.handle && <p className="text-sm text-destructive">{errors.handle}</p>}
      </div>
      <Button type="submit" disabled={pending || !dirty}>
        {pending ? "Saving" : "Save changes"}
      </Button>
    </form>
  );
}
