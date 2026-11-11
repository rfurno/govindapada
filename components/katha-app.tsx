"use client";

import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { Reader } from "@/components/reader";
import { Trainer } from "@/components/trainer";
import { WordCard } from "@/components/word-card";
import { LEXICON } from "@/lib/lexicon";
import { canCreate, fold, hint, matchesFilter, qualify } from "@/lib/selection";
import type { FilterId, Kind, Mode, Size } from "@/lib/types";

const STORAGE_KEY = "katha.v1";

const FILTERS: { id: FilterId; label: string }[][] = [
  [
    { id: "todas", label: "todas" },
    { id: "selecionadas", label: "selecionadas" },
    { id: "M", label: "masculino" },
    { id: "N", label: "neutro" },
    { id: "F", label: "feminino" },
    { id: "V", label: "verbos" },
    { id: "A", label: "adjetivos" },
  ],
  [
    { id: "PRON", label: "pronomes" },
    { id: "IND", label: "indeclináveis" },
    { id: "GER", label: "gerúndio" },
    { id: "INF", label: "infinitivo" },
    { id: "PPP", label: "ppp" },
    { id: "EXP", label: "expressões" },
  ],
];

type Piece = { id: string; body: string; createdAt: string };

type Stored = { selected: string[]; hideGloss: boolean };

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.selected) || typeof parsed.hideGloss !== "boolean") {
      return null;
    }
    const known = new Set(LEXICON.map((word) => word.id));
    return {
      selected: parsed.selected.filter((id) => typeof id === "string" && known.has(id)),
      hideGloss: parsed.hideGloss,
    };
  } catch {
    return null;
  }
}

export function KathaApp({
  libraryConfigured,
  showLogout,
}: {
  libraryConfigured: boolean;
  showLogout: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("todas");
  const [hideGloss, setHideGloss] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("story");
  const [kind, setKind] = useState<Kind>("misturada");
  const [size, setSize] = useState<Size>("media");
  const [panelOpen, setPanelOpen] = useState(false);
  const [library, setLibrary] = useState<{ key: string; pieces: Piece[] }>({ key: "", pieces: [] });
  const [variant, setVariant] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Read after mount so the server render and the first client render match.
    const stored = readStored();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is not available during render
      setSelected(stored.selected);
      setHideGloss(stored.hideGloss);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, hideGloss } satisfies Stored));
  }, [ready, selected, hideGloss]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const qualifying = useMemo(() => qualify(LEXICON, selected, kind), [selected, kind]);
  const enabled = canCreate(mode, qualifying.length);
  const hintText = hint(mode, kind, qualifying.length);
  const requestKey = `${mode}|${kind}|${size}|${[...selected].sort().join(",")}`;
  const pieces = libraryConfigured && enabled && library.key === requestKey ? library.pieces : [];
  const visible = useMemo(() => {
    const needle = fold(query.trim());
    return LEXICON.filter((word) => {
      if (!matchesFilter(word, filter, selectedSet)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return fold(`${word.devanagari} ${word.gloss} ${word.iast} ${word.id}`).includes(needle);
    });
  }, [filter, query, selectedSet]);

  useEffect(() => {
    if (!libraryConfigured || !enabled) {
      return;
    }
    const key = requestKey;
    const params = new URLSearchParams({ mode, kind, size, words: selected.join(",") });
    const controller = new AbortController();
    fetch(`/api/pieces?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { pieces?: Piece[] }) => {
        if (data.pieces) {
          setLibrary({ key, pieces: data.pieces });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [libraryConfigured, enabled, mode, kind, size, selected, requestKey]);

  useEffect(() => {
    if (!requestId) {
      return;
    }
    let stop = false;
    const tick = () => {
      fetch(`/api/requests/${requestId}`)
        .then((response) => response.json())
        .then((data: { request?: { status: string; error: string | null; piece: Piece | null } }) => {
          if (stop) {
            return;
          }
          const row = data.request;
          if (!row || row.status === "pending" || row.status === "running") {
            window.setTimeout(tick, 3000);
            return;
          }
          if (row.status === "done" && row.piece) {
            setLibrary((current) => ({
              key: requestKey,
              pieces: [row.piece as Piece, ...current.pieces.filter((piece) => piece.id !== row.piece?.id)],
            }));
            setVariant(0);
            setRequestError(null);
          } else {
            setRequestError(row.error || "A geração falhou.");
          }
          setRequestId(null);
        })
        .catch(() => {
          if (!stop) {
            window.setTimeout(tick, 3000);
          }
        });
    };
    tick();
    return () => {
      stop = true;
    };
  }, [requestId, requestKey]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function create(force: boolean) {
    setNotice(null);
    setRequestError(null);
    if (!libraryConfigured) {
      setNotice("A biblioteca ainda não está configurada. O quadro funciona; criar uma peça precisa do Supabase.");
      return;
    }
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, kind, size, wordIds: selected, force }),
    });
    const data = (await response.json()) as {
      error?: string;
      pieces?: Piece[];
      decision?: string;
      request?: { id: string };
    };
    if (!response.ok && !data.request && data.decision !== "show") {
      setNotice(data.error ?? "Não foi possível criar a peça.");
      return;
    }
    if (data.pieces) {
      setLibrary({ key: requestKey, pieces: data.pieces });
      setVariant(0);
    }
    if (data.request && data.decision !== "show") {
      setRequestId(data.request.id);
    }
    setPanelOpen(false);
  }

  const safeVariant = Math.min(variant, Math.max(pieces.length - 1, 0));
  const current = pieces[safeVariant] ?? null;
  const showReader = Boolean(current || requestId || requestError);
  const selectedWords = LEXICON.filter((word) => selectedSet.has(word.id));

  const trainer = (
    <Trainer
      selectedWords={selectedWords}
      mode={mode}
      kind={kind}
      size={size}
      hintText={hintText}
      enabled={enabled}
      busy={Boolean(requestId)}
      libraryConfigured={libraryConfigured}
      hasPieces={pieces.length > 0 && enabled}
      onMode={setMode}
      onKind={setKind}
      onSize={setSize}
      onClear={() => setSelected([])}
      onRemove={toggle}
      onCreate={(force) => void create(force)}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-28 lg:pb-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight sm:text-4xl">
            <span className="font-deva text-clay">कथा</span> Histórias com o seu vocabulário
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            Marque as palavras que você ainda <strong>não decorou</strong> e peça uma história em português. Os
            significados dessas palavras aparecem destacados no texto: tente lembrar o termo em sânscrito e toque para
            conferir.
          </p>
        </div>
        {showLogout ? (
          <form action={logoutAction}>
            <button type="submit" className="rounded-full border border-line px-3 py-1 text-sm">
              Sair
            </button>
          </form>
        ) : null}
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="search">
          Buscar em sânscrito ou português
        </label>
        <input
          id="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar em sânscrito ou português"
          className="w-full rounded-2xl border border-line bg-card px-4 py-2 sm:max-w-md"
        />
        <button
          type="button"
          className="rounded-full border border-line bg-card px-4 py-2 text-sm"
          aria-pressed={hideGloss}
          onClick={() => setHideGloss((value) => !value)}
        >
          {hideGloss ? "Mostrar significados" : "Esconder significados"}
        </button>
        <button type="button" className="rounded-full border border-line bg-card px-4 py-2 text-sm" onClick={() => setSelected([])}>
          Limpar seleção
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {FILTERS.map((row) => (
          <div key={row[0]?.id} className="flex flex-wrap gap-2">
            {row.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={filter === chip.id}
                onClick={() => setFilter(chip.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  filter === chip.id ? "border-chip bg-chip text-white" : "border-line bg-card"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {showReader ? (
        <div className="mt-6">
          <Reader
            body={current?.body ?? null}
            index={safeVariant}
            total={pieces.length}
            pending={Boolean(requestId)}
            error={requestError}
            onPrev={() => setVariant((value) => Math.min(pieces.length - 1, value + 1))}
            onNext={() => setVariant((value) => Math.max(0, value - 1))}
            onAnother={() => void create(true)}
            onRetry={() => void create(true)}
          />
          {notice ? <p className="mt-2 text-sm text-clay-deep">{notice}</p> : null}
        </div>
      ) : notice ? (
        <p className="mt-4 text-sm text-clay-deep">{notice}</p>
      ) : null}

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              selected={selectedSet.has(word.id)}
              hideGloss={hideGloss}
              onToggle={toggle}
            />
          ))}
        </div>
        <aside className="sticky top-4 mt-6 hidden rounded-3xl border border-line bg-card p-5 lg:mt-0 lg:block">
          {trainer}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card p-3 lg:hidden">
        <button type="button" className="w-full rounded-2xl bg-clay py-3 text-white" onClick={() => setPanelOpen(true)}>
          {qualifying.length} selecionadas · {mode === "story" ? "Criar história" : mode === "poem" ? "Criar poema" : "Criar haiku"}
        </button>
      </div>
      {panelOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setPanelOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl bg-card p-5"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Palavras para treinar"
          >
            {trainer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
