import type { Word } from "@/lib/types";

const TAG_LABEL: Record<Word["tag"], string> = {
  M: "M",
  N: "N",
  F: "F",
  A: "A",
  V: "V",
  PRON: "PRON",
  IND: "IND",
  GER: "GER",
  INF: "INF",
  PPP: "PPP",
  EXP: "EXP",
};

export function WordCard({
  word,
  selected,
  hideGloss,
  onToggle,
}: {
  word: Word;
  selected: boolean;
  hideGloss: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(word.id)}
      className={`relative min-h-24 rounded-2xl border px-3 py-3 text-left ${
        selected ? "border-peach-line bg-peach" : "border-line bg-card"
      }`}
    >
      <span className="absolute top-2 right-3 text-[10px] tracking-wide text-muted">{TAG_LABEL[word.tag]}</span>
      <span className="block pr-8 font-deva text-xl leading-snug">{word.devanagari}</span>
      {hideGloss ? null : <span className="mt-1 block text-sm text-muted">{word.gloss}</span>}
      {selected ? (
        <span className="absolute right-3 bottom-2 text-sm text-clay-deep" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  );
}
