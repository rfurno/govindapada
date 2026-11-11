import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/secure-compare";

export const SESSION_DAYS = 30;

export type SessionPayload = {
  sub: "katha";
  exp: number;
};

function authSecret() {
  return process.env.AUTH_SECRET ?? "";
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function sessionCookieSecure() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function createSessionToken() {
  const secret = authSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  const payload: SessionPayload = {
    sub: "katha",
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const secret = authSecret();
  if (!secret || !token) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(sign(encoded, secret), signature)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (payload.sub !== "katha" || typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
