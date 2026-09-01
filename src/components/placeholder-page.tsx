import Link from "next/link";

import { Button } from "@/src/components/ui/button";

/**
 * Shared shell for routes that exist for navigation but have no content yet.
 */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          This page is not built yet.
        </p>
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
