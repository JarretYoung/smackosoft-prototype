"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import type { MatchFormat } from "@/src/contract";
import { addMatch } from "@/src/features/matches/add-match";
import { errorMessage } from "@/src/lib/errors";

/** The first game or match of a session. It makes the row and opens it in the editor, so there is no empty screen in between. */
export function AddFirstButtons({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function add(format: MatchFormat) {
    start(async () => {
      const added = await addMatch(sessionId, format, []);
      if (!added.ok) return void toast.error(errorMessage(added.error));
      router.push(`/sessions/${sessionId}/matches/edit?m=${added.data}`);
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button type="button" disabled={pending} onClick={() => add("BO1")}>
        {pending ? <Spinner /> : <Plus />} Add a game
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => add("BO3")}>
        Add a match
      </Button>
    </div>
  );
}
