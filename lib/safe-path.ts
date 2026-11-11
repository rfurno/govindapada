export function safeNextPath(next: string) {
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  if (next.includes("\\") || next.includes("://")) {
    return "/";
  }
  return next;
}
