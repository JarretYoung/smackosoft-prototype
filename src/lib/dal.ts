import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { JwtPayload, User } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";

const LOGIN_ROUTE = "/auth/login";

export type Session = {
  userId: string;
  email?: string;
  claims: JwtPayload;
};

/**
 * The authoritative answer to "who is making this request".
 *
 * Reads the session from the `sb-*-auth-token` cookie and verifies its
 * signature in-process against the project's public JWKS (cached ~10 min), so
 * it normally costs no network round trip. That holds only while the project
 * signs asymmetrically: on a legacy HS256 secret `getClaims()` cannot verify
 * locally and quietly falls back to a `getUser()` call instead.
 *
 * The trade-off is that a session revoked elsewhere stays valid here until the
 * token expires (`jwt_expiry`, 1h by default) — use {@link getCurrentUser}
 * where that matters.
 *
 * Returns null when signed out; callers that should bounce to the login page
 * want {@link requireSession} instead.
 */
export const verifySession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return {
    userId: data.claims.sub,
    email: data.claims.email,
    claims: data.claims,
  };
});

/** {@link verifySession}, but redirects to the login page when signed out. */
export async function requireSession(): Promise<Session> {
  const session = await verifySession();

  if (!session) {
    redirect(LOGIN_ROUTE);
  }

  return session;
}

/**
 * The current user, read fresh from the Auth server.
 *
 * Unlike {@link verifySession} this reflects revocation immediately — a signed
 * out or banned user fails here even while their token is still unexpired — at
 * the cost of a round trip. Reach for it on sensitive operations; use
 * {@link verifySession} for ordinary route gating.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return null;
  }

  return data.user;
});

/** {@link getCurrentUser}, but redirects to the login page when signed out. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  return user;
}

/**
 * The entry point for any query that reads or writes user-owned data.
 *
 * Hands back a Supabase client *and* the verified session together, so the
 * auth check is not a separate line a caller can forget — it is baked into the
 * only sanctioned way of getting a client for user data. Prefer this over
 * importing `createClient` directly anywhere outside this file.
 *
 * Gated by {@link requireSession}, so it redirects signed-out callers and
 * carries the same revocation lag. For mutations and anything sensitive, use
 * {@link getAuthedClientFresh}.
 */
export const getAuthedClient = cache(async () => {
  const session = await requireSession();
  const supabase = await createClient();

  return { supabase, session };
});

/**
 * {@link getAuthedClient} for operations where a just-revoked user acting
 * would actually cause harm — mutations, deletions, payments, anything in a
 * Server Action. Pays a round trip to the Auth server to catch a session that
 * was revoked elsewhere.
 */
export const getAuthedClientFresh = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();

  return { supabase, user };
});
