import type { FilterId, Kind, Mode, Size, Word } from "@/lib/types";

export const MIN_WORDS = 3;
export const HAIKU_MAX_WORDS = 5;

const KIND_TAGS: Record<Exclude<Kind, "misturada">, Word["tag"]> = {
  F: "F",
  N: "N",
  M: "M",
  V: "V",
};

export function qualify(lexicon: readonly Word[], selectedIds: readonly string[], kind: Kind) {
  const selected = new Set(selectedIds);
  const marked = lexicon.filter((word) => selected.has(word.id));
  if (kind === "misturada") {
    return marked;
  }
  const tag = KIND_TAGS[kind];
  return marked.filter((word) => word.tag === tag);
}

export function cacheKey(mode: Mode, kind: Kind, size: Size, wordIds: readonly string[]) {
  const sizePart = mode === "haiku" ? "-" : size;
  const ids = [...wordIds].sort().join(",");
  return `${mode}|${kind}|${sizePart}|${ids}`;
}

export function canCreate(mode: Mode, count: number) {
  if (count < MIN_WORDS) {
    return false;
  }
  if (mode === "haiku" && count > HAIKU_MAX_WORDS) {
    return false;
  }
  return true;
}

const MODE_NOUN: Record<Mode, string> = {
  story: "A história",
  poem: "O poema",
  haiku: "O haiku",
};

const KIND_PHRASE: Record<Kind, string> = {
  misturada: "todas as palavras marcadas, de qualquer classe",
  F: "só as palavras femininas marcadas",
  N: "só as palavras neutras marcadas",
  M: "só as palavras masculinas marcadas",
  V: "só os verbos marcados",
};

export function hint(mode: Mode, kind: Kind, count: number) {
  if (mode === "haiku" && count > HAIKU_MAX_WORDS) {
    return "Um haiku cabe até 5 palavras. Para este conjunto, use um poema.";
  }
  const base = `${MODE_NOUN[mode]} usa ${KIND_PHRASE[kind]}.`;
  if (count < MIN_WORDS) {
    return `${base} Marque pelo menos 3.`;
  }
  return base;
}

export function searchText(word: Word) {
  return `${word.devanagari} ${word.gloss} ${word.iast} ${word.id}`;
}

export function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function matchesQuery(word: Word, query: string) {
  const needle = fold(query.trim());
  if (!needle) {
    return true;
  }
  return fold(searchText(word)).includes(needle);
}

export function matchesFilter(word: Word, filter: FilterId, selected: ReadonlySet<string>) {
  if (filter === "todas") {
    return true;
  }
  if (filter === "selecionadas") {
    return selected.has(word.id);
  }
  return word.tag === filter;
}

export type EnqueueDecision = "attach" | "show" | "insert";

export function decideEnqueue(input: { pieceCount: number; inflight: boolean; force: boolean }): EnqueueDecision {
  if (input.inflight) {
    return "attach";
  }
  if (input.pieceCount > 0 && !input.force) {
    return "show";
  }
  return "insert";
}
