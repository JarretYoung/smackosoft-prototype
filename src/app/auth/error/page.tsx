import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/src/components/auth-shell";
import { Button } from "@/src/components/ui/button";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-[0.9375rem] text-muted-foreground">
      {params?.error ? `Code error: ${params.error}` : "An unspecified error occurred."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthShell title="Something went wrong">
      <Suspense>
        <ErrorContent searchParams={searchParams} />
      </Suspense>
      <Button asChild variant="secondary" size="lg">
        <Link href="/auth/login">Back to log in</Link>
      </Button>
    </AuthShell>
  );
}
