"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookie, passwordMatches, setSessionCookie } from "@/lib/auth";
import { clearLoginFailures, clientIp, isLoginLimited, recordLoginFailure } from "@/lib/login-rate-limit";
import { safeNextPath } from "@/lib/safe-path";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const ip = clientIp(await headers());

  if (isLoginLimited(ip)) {
    redirect("/login?error=rate");
  }
  if (!passwordMatches(password)) {
    recordLoginFailure(ip);
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  clearLoginFailures(ip);
  await setSessionCookie();
  redirect(next);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
