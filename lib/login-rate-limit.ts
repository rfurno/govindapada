const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const failures = new Map<string, number[]>();

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

function prune(ip: string, now = Date.now()) {
  const recent = (failures.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length) {
    failures.set(ip, recent);
  } else {
    failures.delete(ip);
  }
  return recent;
}

export function isLoginLimited(ip: string, now = Date.now()) {
  return prune(ip, now).length >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string, now = Date.now()) {
  const recent = prune(ip, now);
  recent.push(now);
  failures.set(ip, recent);
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
