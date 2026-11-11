"use client";

import { useState } from "react";
import { wordById } from "@/lib/lexicon";
import { parsePiece, type Segment } from "@/lib/piece";

const TAG_NAME: Record<string, string> = {
  M: "masculino",
  N: "neutro",
  F: "feminino",
  A: "adjetivo",
  V: "verbo",
  PRON: "pronome",
  IND: "indeclinável",
  GER: "gerúndio",
  INF: "infinitivo",
  PPP: "ppp",
  EXP: "expressão",
};

function Mark({ segment }: { segment: Extract<Segment, { type: "mark" }> }) {
  const [open, setOpen] = useState(false);
  const word = wordById(segment.id);
  return (
    <button
      type="button"
      className="mx-0.5 inline rounded-md bg-peach px-1 text-left text-ink underline decoration-peach-line decoration-2 underline-offset-2"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      {segment.surface || word?.gloss}
      {open && word ? (
        <span className="ml-1 font-deva no-underline">
          {word.devanagari}
          <span className="font-serif text-sm text-muted"> · {TAG_NAME[word.tag]}</span>
        </span>
      ) : null}
      <span className="sr-only">{open ? "esconder o termo" : "mostrar o termo em sânscrito"}</span>
    </button>
  );
}

export function Reader({
  body,
  index,
  total,
  onPrev,
  onNext,
  onAnother,
  pending,
  error,
  onRetry,
}: {
  body: string | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onAnother: () => void;
  pending: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const segments = body ? parsePiece(body) : [];
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      {pending ? (
        <p className="text-sm text-muted">
          Na fila. A peça aparece quando o gerador neste computador pegar o pedido.
        </p>
      ) : null}
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-clay-deep">{error}</p>
          <button type="button" className="text-sm underline" onClick={onRetry}>
            Tentar de novo
          </button>
        </div>
      ) : null}
      {body ? (
        <div className="text-lg leading-relaxed whitespace-pre-wrap">
          {segments.map((segment, segmentIndex) =>
            segment.type === "text" ? (
              <span key={segmentIndex}>{segment.text}</span>
            ) : (
              <Mark key={`${segment.id}-${segmentIndex}`} segment={segment} />
            ),
          )}
        </div>
      ) : null}
      {total > 1 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="rounded-full border border-line px-3 py-1 disabled:opacity-40" onClick={onPrev} disabled={index >= total - 1}>
            Anterior
          </button>
          <span>
            {index + 1} de {total}
          </span>
          <button type="button" className="rounded-full border border-line px-3 py-1 disabled:opacity-40" onClick={onNext} disabled={index === 0}>
            Seguinte
          </button>
        </div>
      ) : null}
      {total > 0 ? (
        <div className="mt-4">
          <button type="button" className="rounded-full border border-line px-3 py-1 text-sm" onClick={onAnother}>
            Gerar outra
          </button>
        </div>
      ) : null}
    </section>
  );
}
