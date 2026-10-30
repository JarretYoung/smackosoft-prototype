"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ok, type Ack } from "@/src/contract";
import { createClient } from "@/src/lib/supabase/server";
import { authFailure, emailProblem, inputFailure, passwordProblem } from "@/src/features/auth/auth-errors";
import { originOf } from "@/src/features/auth/origin";

export type Credentials = { email: string; password: string };

/** Signs in with email and password, then goes to the front door. Returns only a failure. */
export async function signIn(input: Credentials): Promise<Ack> {
  const email = String(input?.email ?? "").trim();
  const password = String(input?.password ?? "");
  const invalid = inputFailure({ email: emailProblem(email), password: password ? undefined : "Enter your password" });
  if (invalid) return invalid;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return authFailure(error, "password");
  } catch (error) {
    return authFailure(error, "password");
  }
  redirect("/");
}

async function siteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = originOf((name) => requestHeaders.get(name));
  if (!origin) throw new Error("The request has no host header.");
  return origin;
}

/**
 * Creates the account. With email confirmation on, no session exists yet and the person
 * has to open the email first. With it off, they carry on to onboarding.
 */
export async function signUp(input: Credentials): Promise<Ack> {
  const email = String(input?.email ?? "").trim();
  const password = String(input?.password ?? "");
  const invalid = inputFailure({ email: emailProblem(email), password: passwordProblem(password) });
  if (invalid) return invalid;

  let hasSession: boolean;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Only used when the email template links straight to the app. The template in
      // supabase/templates goes through /auth/confirm instead.
      options: { emailRedirectTo: `${await siteOrigin()}/` },
    });
    if (error) return authFailure(error, "password");
    hasSession = !!data.session;
  } catch (error) {
    return authFailure(error, "password");
  }
  redirect(hasSession ? "/onboarding" : "/auth/sign-up-success");
}

/** Starts the Google sign in. Sign in and sign up are the same thing here. */
export async function signInWithGoogle(): Promise<Ack> {
  let url: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${await siteOrigin()}/auth/callback` },
    });
    if (error) return authFailure(error, "email");
    url = data.url;
  } catch (error) {
    return authFailure(error, "email");
  }
  redirect(url);
}

/** Sends the reset email. The link goes through /auth/confirm to the update password page. */
export async function requestPasswordReset(input: { email: string }): Promise<Ack> {
  const email = String(input?.email ?? "").trim();
  const invalid = inputFailure({ email: emailProblem(email) });
  if (invalid) return invalid;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await siteOrigin()}/auth/update-password`,
    });
    if (error) return authFailure(error, "email");
  } catch (error) {
    return authFailure(error, "email");
  }
  return ok(undefined);
}

/** Saves the new password for the person the reset link signed in, then goes to the front door. */
export async function updatePassword(input: { password: string }): Promise<Ack> {
  const password = String(input?.password ?? "");
  const invalid = inputFailure({ password: passwordProblem(password) });
  if (invalid) return invalid;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return authFailure(error, "password");
  } catch (error) {
    return authFailure(error, "password");
  }
  redirect("/");
}

/** Ends the session and goes to the login page. */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // The cookies are the session. A failed call to Supabase must not trap the person in.
  }
  redirect("/auth/login");
}
