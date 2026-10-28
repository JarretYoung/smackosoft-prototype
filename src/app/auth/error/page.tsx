import Link from "next/link";
import { AuthShell } from "@/src/components/auth-shell";
import { Button } from "@/src/components/ui/button";

export default function Page() {
  return (
    <AuthShell title="That link did not work">
      <p className="text-subhead text-muted-foreground">
        The link may have expired or been used already. Log in, or ask for a new email.
      </p>
      <Button asChild variant="secondary" size="lg">
        <Link href="/auth/login">Back to log in</Link>
      </Button>
    </AuthShell>
  );
}
