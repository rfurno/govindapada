import { ENTRIES } from "../data/entries.ts";
import { slugFromIast, toIast } from "./iast.ts";
import type { Word } from "./types.ts";

export const LEXICON: readonly Word[] = ENTRIES.map((entry) => {
  const iast = toIast(entry.devanagari);
  return {
    id: slugFromIast(iast),
    devanagari: entry.devanagari,
    iast,
    gloss: entry.gloss,
    tag: entry.tag,
  };
});

const byId = new Map(LEXICON.map((word) => [word.id, word]));

export function wordById(id: string) {
  return byId.get(id) ?? null;
}

export function wordsByIds(ids: readonly string[]) {
  const found: Word[] = [];
  for (const id of ids) {
    const word = byId.get(id);
    if (word) {
      found.push(word);
    }
  }
  return found;
}
