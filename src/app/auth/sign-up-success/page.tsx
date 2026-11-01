import Link from "next/link";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { Button } from "@/src/components/ui/button";

export default function Page() {
  return (
    <AuthShell title="Check your email" description="One step left before you can sign in.">
      <p className="text-subhead text-muted-foreground">
        You have signed up. Confirm your account from the email we sent, then log in.
      </p>
      <Button asChild variant="secondary" size="lg">
        <Link href="/auth/login">Back to log in</Link>
      </Button>
    </AuthShell>
  );
}
