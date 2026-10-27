import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-14 bg-accent text-primary">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle className="text-2xl font-bold tracking-tight">We could not find that</EmptyTitle>
          <EmptyDescription>It may not exist, or you may not have access to it.</EmptyDescription>
        </EmptyHeader>
        <Button asChild size="lg">
          <Link href="/home">Back to Home</Link>
        </Button>
      </Empty>
    </main>
  );
}
