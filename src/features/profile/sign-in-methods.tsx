import { KeyRound } from "lucide-react";
import { GoogleMark } from "@/src/components/google-mark";

const METHODS: Record<string, { label: string; icon: React.ReactNode }> = {
  google: { label: "Google", icon: <GoogleMark className="size-5" /> },
  email: { label: "Email and password", icon: <KeyRound className="size-5 text-muted-foreground" /> },
};

/**
 * How this person signs in, read only. Supabase links methods that share a verified email,
 * so one person can have both. There is no link or unlink here on purpose.
 */
export function SignInMethods({ email, providers }: { email: string | null; providers: string[] }) {
  const methods = providers.filter((p) => METHODS[p]);
  if (methods.length === 0) return null;

  return (
    <section aria-labelledby="signin-heading" className="flex flex-col gap-2">
      <h2 id="signin-heading" className="section-label">
        Linked accounts
      </h2>
      <div className="group-list">
        {methods.map((provider) => (
          <div key={provider} className="list-row">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">{METHODS[provider].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium">{METHODS[provider].label}</p>
              {email && <p className="truncate text-sm text-muted-foreground">{email}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
