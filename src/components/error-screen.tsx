"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";

/**
 * What a route shows when it fails to load, for instance when the database is slow or down. It says
 * nothing about the cause, because the cause can name tables and values. "Try again" draws the
 * route again from the server.
 */
export function ErrorScreen({ reset }: { reset: () => void }) {
  const router = useRouter();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="px-4 pt-6 pb-4">
      <Empty className="bg-card shadow-card">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-accent text-primary">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>Could not load this</EmptyTitle>
          <EmptyDescription>Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <Button onClick={retry}>Try again</Button>
      </Empty>
    </main>
  );
}
