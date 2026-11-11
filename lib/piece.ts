import type { Mode, Word } from "./types.ts";

export type Segment =
  | { type: "text"; text: string }
  | { type: "mark"; id: string; surface: string };

const MARK = /«([^|»\n]+)\|([^»\n]*)»/g;

export function parsePiece(body: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of body.matchAll(MARK)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ type: "text", text: body.slice(cursor, index) });
    }
    segments.push({ type: "mark", id: match[1] ?? "", surface: match[2] ?? "" });
    cursor = index + match[0].length;
  }
  if (cursor < body.length) {
    segments.push({ type: "text", text: body.slice(cursor) });
  }
  return segments;
}

export function pieceLineCount(body: string) {
  return body.split(/\r?\n/).filter((line) => line.trim()).length;
}

export type PieceIssue = "missing" | "unknown" | "duplicate" | "lines";

export function validatePiece(body: string, words: readonly Word[], mode: Mode) {
  const issues: { code: PieceIssue; id?: string }[] = [];
  const seen = new Map<string, number>();
  for (const segment of parsePiece(body)) {
    if (segment.type !== "mark") {
      continue;
    }
    seen.set(segment.id, (seen.get(segment.id) ?? 0) + 1);
  }
  const allowed = new Set(words.map((word) => word.id));
  for (const word of words) {
    const count = seen.get(word.id) ?? 0;
    if (count === 0) {
      issues.push({ code: "missing", id: word.id });
    } else if (count > 1) {
      issues.push({ code: "duplicate", id: word.id });
    }
  }
  for (const id of seen.keys()) {
    if (!allowed.has(id)) {
      issues.push({ code: "unknown", id });
    }
  }
  if (mode === "haiku" && pieceLineCount(body) !== 3) {
    issues.push({ code: "lines" });
  }
  return issues;
}

export function issueSummary(issues: { code: PieceIssue; id?: string }[]) {
  if (issues.length === 0) {
    return "";
  }
  return issues
    .map((issue) => (issue.id ? `${issue.code}:${issue.id}` : issue.code))
    .join(", ");
}
