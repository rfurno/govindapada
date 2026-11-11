export const TAGS = [
  "M",
  "N",
  "F",
  "A",
  "V",
  "PRON",
  "IND",
  "GER",
  "INF",
  "PPP",
  "EXP",
] as const;

export type Tag = (typeof TAGS)[number];

export type Word = {
  id: string;
  devanagari: string;
  iast: string;
  gloss: string;
  tag: Tag;
};

export const MODES = ["story", "poem", "haiku"] as const;
export type Mode = (typeof MODES)[number];

export const KINDS = ["misturada", "F", "N", "M", "V"] as const;
export type Kind = (typeof KINDS)[number];

export const SIZES = ["curta", "media", "longa"] as const;
export type Size = (typeof SIZES)[number];

export const FILTERS = [
  "todas",
  "selecionadas",
  "M",
  "N",
  "F",
  "A",
  "V",
  "PRON",
  "IND",
  "GER",
  "INF",
  "PPP",
  "EXP",
] as const;

export type FilterId = (typeof FILTERS)[number];

export type Entry = {
  devanagari: string;
  gloss: string;
  tag: Tag;
};
