import { LoginForm } from "@/src/features/auth/login-form";

// Signing out lands here from a page whose tab bar links use `prefetch`. See docs/architecture.md.
export const instant = false;

export default function Page() {
  return <LoginForm />;
}
