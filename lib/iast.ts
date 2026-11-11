const INDEPENDENT: Record<string, string> = {
  अ: "a",
  आ: "ā",
  इ: "i",
  ई: "ī",
  उ: "u",
  ऊ: "ū",
  ऋ: "ṛ",
  ॠ: "ṝ",
  ऌ: "ḷ",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
};

const SIGNS: Record<string, string> = {
  "ा": "ā",
  "ि": "i",
  "ी": "ī",
  "ु": "u",
  "ू": "ū",
  "ृ": "ṛ",
  "ॄ": "ṝ",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
};

const CONSONANTS: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ṅ",
  च: "c",
  छ: "ch",
  ज: "j",
  झ: "jh",
  ञ: "ñ",
  ट: "ṭ",
  ठ: "ṭh",
  ड: "ḍ",
  ढ: "ḍh",
  ण: "ṇ",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "ś",
  ष: "ṣ",
  स: "s",
  ह: "h",
};

const VIRAMA = "्";
const ANUSVARA = "ं";
const VISARGA = "ः";

const SLUG_FOLDS: Record<string, string> = {
  ā: "a",
  ī: "i",
  ū: "u",
  ṛ: "r",
  ṝ: "r",
  ḷ: "l",
  ṅ: "n",
  ñ: "n",
  ṭ: "t",
  ḍ: "d",
  ṇ: "n",
  ś: "s",
  ṣ: "s",
  ḥ: "h",
  ṃ: "m",
  ṁ: "m",
};

/** IAST for a Devanagari headword. Inherent *a* is kept unless a vowel sign or virama replaces it. */
export function toIast(devanagari: string) {
  const chars = [...devanagari];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (!char) {
      continue;
    }
    if (char === " " || char === "\u00a0") {
      out += " ";
      continue;
    }
    if (char === ANUSVARA) {
      out += "ṃ";
      continue;
    }
    if (char === VISARGA) {
      out += "ḥ";
      continue;
    }
    const vowel = INDEPENDENT[char];
    if (vowel) {
      out += vowel;
      continue;
    }
    const consonant = CONSONANTS[char];
    if (!consonant) {
      continue;
    }
    const next = chars[i + 1];
    if (next === VIRAMA) {
      out += consonant;
      i += 1;
      continue;
    }
    const sign = next ? SIGNS[next] : undefined;
    if (sign) {
      out += consonant + sign;
      i += 1;
      continue;
    }
    out += `${consonant}a`;
  }
  return out.replace(/ +/g, " ").trim();
}

export function slugFromIast(iast: string) {
  const folded = [...iast].map((char) => SLUG_FOLDS[char] ?? char).join("");
  return folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
