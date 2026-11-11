import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { readSessionToken } from "@/lib/session-token";

function authRequired() {
  if (process.env.KATHA_PASSWORD) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function deny(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return withNoIndex(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }));
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  if (pathname !== "/") {
    login.searchParams.set("next", pathname);
  }
  const response = NextResponse.redirect(login);
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    response.cookies.delete(SESSION_COOKIE);
  }
  return withNoIndex(response);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login")) {
    return withNoIndex(NextResponse.next());
  }
  if (!authRequired()) {
    return withNoIndex(NextResponse.next());
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!readSessionToken(token ?? "")) {
    return deny(request);
  }
  return withNoIndex(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
