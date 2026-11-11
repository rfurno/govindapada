import { LEXICON, wordById } from "@/lib/lexicon";
import { cacheKey, canCreate, qualify } from "@/lib/selection";
import { KINDS, MODES, SIZES, type Kind, type Mode, type Size } from "@/lib/types";

export type RequestSpec = {
  mode: Mode;
  kind: Kind;
  size: Size | null;
  wordIds: string[];
  cacheKey: string;
};

export type SpecResult = { ok: true; spec: RequestSpec } | { ok: false; error: string };

function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function buildRequest(input: {
  mode?: unknown;
  kind?: unknown;
  size?: unknown;
  wordIds?: unknown;
}): SpecResult {
  if (!isMode(input.mode) || !isKind(input.kind) || !isSize(input.size)) {
    return { ok: false, error: "Modo, tipo ou tamanho inválido." };
  }
  if (!Array.isArray(input.wordIds) || input.wordIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "Lista de palavras inválida." };
  }
  const unknown = input.wordIds.filter((id) => !wordById(id));
  if (unknown.length > 0) {
    return { ok: false, error: "Há uma palavra que não está na lista." };
  }
  const qualifying = qualify(LEXICON, input.wordIds, input.kind);
  if (!canCreate(input.mode, qualifying.length)) {
    return { ok: false, error: "Este conjunto não cabe neste formato." };
  }
  const wordIds = qualifying.map((word) => word.id);
  return {
    ok: true,
    spec: {
      mode: input.mode,
      kind: input.kind,
      size: input.mode === "haiku" ? null : input.size,
      wordIds,
      cacheKey: cacheKey(input.mode, input.kind, input.size, wordIds),
    },
  };
}
