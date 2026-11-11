import { describe, expect, it } from "vitest";
import { LEXICON } from "@/lib/lexicon";
import { toIast } from "@/lib/iast";
import { issueSummary, parsePiece, validatePiece } from "@/lib/piece";
import { buildRequest } from "@/lib/request-spec";
import { cacheKey, canCreate, decideEnqueue, hint, qualify } from "@/lib/selection";

const byGloss = (gloss: string) => {
  const word = LEXICON.find((item) => item.gloss === gloss);
  if (!word) {
    throw new Error(`missing gloss ${gloss}`);
  }
  return word;
};

describe("lexicon", () => {
  it("has 141 unique headwords, one tag each", () => {
    expect(LEXICON).toHaveLength(141);
    expect(new Set(LEXICON.map((word) => word.id)).size).toBe(141);
    expect(new Set(LEXICON.map((word) => word.devanagari)).size).toBe(141);
    for (const word of LEXICON) {
      expect(word.gloss.length).toBeGreaterThan(0);
      expect(word.tag).toMatch(/^(M|N|F|A|V|PRON|IND|GER|INF|PPP|EXP)$/);
      expect(word.iast).toBe(toIast(word.devanagari));
    }
  });

  it("keeps the feminine set and a few known spellings", () => {
    const feminine = LEXICON.filter((word) => word.tag === "F").map((word) => word.gloss);
    expect(feminine).toEqual(["fome", "rio", "sede", "beleza", "sucesso"]);
    expect(byGloss("montanha").tag).toBe("M");
    expect(byGloss("montanha").devanagari).toBe("पर्वत");
    expect(byGloss("rio").devanagari).toBe("नदी");
    expect(byGloss("água").tag).toBe("N");
    expect(byGloss("ele compreende, percebe").devanagari).toBe("अवगच्छति");
    expect(byGloss("pouco a pouco").tag).toBe("EXP");
  });
});

describe("selection", () => {
  const nadi = byGloss("rio");
  const parvata = byGloss("montanha");
  const sukha = byGloss("felicidade, conforto");
  const pasyati = byGloss("ele vê");

  it("qualifies by kind and builds a stable key", () => {
    const ids = [pasyati.id, nadi.id, parvata.id, sukha.id];
    expect(qualify(LEXICON, ids, "misturada").map((word) => word.id)).toEqual([
      nadi.id,
      parvata.id,
      pasyati.id,
      sukha.id,
    ]);
    expect(qualify(LEXICON, ids, "M").map((word) => word.gloss)).toEqual(["montanha"]);
    expect(qualify(LEXICON, ids, "V").map((word) => word.gloss)).toEqual(["ele vê"]);
    const key = cacheKey("story", "misturada", "media", ids);
    expect(key).toBe(cacheKey("story", "misturada", "media", [...ids].reverse()));
    expect(cacheKey("haiku", "M", "longa", [parvata.id, nadi.id, sukha.id])).toBe(
      `haiku|M|-|${[nadi.id, parvata.id, sukha.id].sort().join(",")}`,
    );
  });

  it("blocks a short set and a long haiku", () => {
    expect(canCreate("story", 2)).toBe(false);
    expect(canCreate("poem", 3)).toBe(true);
    expect(canCreate("haiku", 5)).toBe(true);
    expect(canCreate("haiku", 6)).toBe(false);
    expect(hint("haiku", "misturada", 6)).toMatch(/use um poema/);
    expect(hint("story", "M", 1)).toMatch(/Marque pelo menos 3/);
    expect(hint("story", "misturada", 3)).toBe("A história usa todas as palavras marcadas, de qualquer classe.");
  });

  it("reuses a stored piece unless a job is in flight or the reader asks for another", () => {
    expect(decideEnqueue({ pieceCount: 1, inflight: false, force: false })).toBe("show");
    expect(decideEnqueue({ pieceCount: 1, inflight: false, force: true })).toBe("insert");
    expect(decideEnqueue({ pieceCount: 2, inflight: true, force: true })).toBe("attach");
    expect(decideEnqueue({ pieceCount: 0, inflight: false, force: false })).toBe("insert");
  });
});

describe("requests", () => {
  it("rejects an unknown id and a haiku that is too long", () => {
    const three = LEXICON.filter((word) => word.tag === "M").slice(0, 3);
    const ok = buildRequest({ mode: "haiku", kind: "M", size: "longa", wordIds: three.map((word) => word.id) });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.spec.size).toBeNull();
      expect(ok.spec.cacheKey.startsWith("haiku|M|-")).toBe(true);
    }
    const unknown = buildRequest({ mode: "story", kind: "misturada", size: "media", wordIds: ["nope", "nope2", "nope3"] });
    expect(unknown.ok).toBe(false);
    const six = LEXICON.filter((word) => word.tag === "M").slice(0, 6);
    const longHaiku = buildRequest({
      mode: "haiku",
      kind: "M",
      size: "media",
      wordIds: six.map((word) => word.id),
    });
    expect(longHaiku.ok).toBe(false);
  });
});

describe("piece", () => {
  const words = [byGloss("corvo"), byGloss("montanha"), byGloss("pedra")];

  it("parses highlights and requires three haiku lines", () => {
    const body = ["O «kaka|corvo» na «parvata|montanha».", "A «pasana|pedra» espera.", "Silêncio."].join("\n");
    const segments = parsePiece(body);
    expect(segments.filter((segment) => segment.type === "mark")).toHaveLength(3);
    expect(validatePiece(body, words, "haiku")).toEqual([]);
    const missing = validatePiece("O «kaka|corvo» só.", words, "story");
    expect(missing.map((issue) => issue.code)).toContain("missing");
    expect(issueSummary(missing)).toMatch(/missing:/);
    const extraLine = `${body}\nQuarta linha «kaka|corvo».`;
    expect(validatePiece(extraLine, words, "haiku").some((issue) => issue.code === "lines" || issue.code === "duplicate")).toBe(
      true,
    );
  });
});
