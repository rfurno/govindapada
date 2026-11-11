import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { safeEqual } from "@/lib/secure-compare";
import {
  SESSION_DAYS,
  createSessionToken,
  readSessionToken,
  sessionCookieSecure,
} from "@/lib/session-token";

export function authConfigured() {
  return Boolean(process.env.KATHA_PASSWORD && process.env.AUTH_SECRET);
}

/** Development without a password stays open so the board can be tried. Production stays closed. */
export function authRequired() {
  if (process.env.KATHA_PASSWORD) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

export function passwordMatches(password: string) {
  const expected = process.env.KATHA_PASSWORD ?? "";
  return Boolean(expected) && safeEqual(password, expected);
}

export async function getSession() {
  if (!authRequired()) {
    return { sub: "katha" as const, exp: 0 };
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return readSessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function setSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
