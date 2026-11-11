import { timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const max = Math.max(left.length, right.length, 1);
  const paddedLeft = Buffer.alloc(max);
  const paddedRight = Buffer.alloc(max);
  left.copy(paddedLeft);
  right.copy(paddedRight);
  return timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length;
}
