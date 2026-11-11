import type { Kind, Mode, Size, Word } from "@/lib/types";

const MODES: { id: Mode; label: string }[] = [
  { id: "story", label: "História" },
  { id: "poem", label: "Poema" },
  { id: "haiku", label: "Haiku" },
];

const KINDS: { id: Kind; label: string }[] = [
  { id: "misturada", label: "Misturada" },
  { id: "F", label: "Femininas" },
  { id: "N", label: "Neutras" },
  { id: "M", label: "Masculinas" },
  { id: "V", label: "Verbos" },
];

const CREATE_LABEL: Record<Mode, string> = {
  story: "Criar história",
  poem: "Criar poema",
  haiku: "Criar haiku",
};

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? "border-chip bg-chip text-white" : "border-line bg-card"
      }`}
    >
      {children}
    </button>
  );
}

export function Trainer({
  selectedWords,
  mode,
  kind,
  size,
  hintText,
  enabled,
  busy,
  libraryConfigured,
  hasPieces,
  onMode,
  onKind,
  onSize,
  onClear,
  onRemove,
  onCreate,
}: {
  selectedWords: readonly Word[];
  mode: Mode;
  kind: Kind;
  size: Size;
  hintText: string;
  enabled: boolean;
  busy: boolean;
  libraryConfigured: boolean;
  hasPieces: boolean;
  onMode: (mode: Mode) => void;
  onKind: (kind: Kind) => void;
  onSize: (size: Size) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onCreate: (force: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Palavras para treinar</h2>
          <p className="mt-1 text-sm text-muted">
            {selectedWords.length === 0 ? "Nenhuma selecionada." : `${selectedWords.length} selecionadas.`}
          </p>
        </div>
        <button type="button" className="shrink-0 rounded-full border border-line px-3 py-1 text-sm whitespace-nowrap" onClick={onClear}>
          Limpar seleção
        </button>
      </div>
      {selectedWords.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedWords.map((word) => (
            <li key={word.id}>
              <button
                type="button"
                className="rounded-full bg-peach px-3 py-1 font-deva text-sm"
                onClick={() => onRemove(word.id)}
              >
                {word.devanagari}
                <span className="sr-only">remover</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <p className="mb-2 text-sm">Formato</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((item) => (
            <Chip key={item.id} active={mode === item.id} onClick={() => onMode(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((item) => (
            <Chip key={item.id} active={kind === item.id} onClick={() => onKind(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </div>
      {mode === "haiku" ? null : (
        <label className="flex items-center gap-3 text-sm">
          Tamanho
          <select
            className="rounded-xl border border-line bg-card px-3 py-1"
            value={size}
            onChange={(event) => onSize(event.target.value as Size)}
          >
            <option value="curta">curta</option>
            <option value="media">média</option>
            <option value="longa">longa</option>
          </select>
        </label>
      )}
      <p className="text-sm text-muted">{hintText}</p>
      {hasPieces ? <p className="text-sm">Já há uma peça para estas palavras.</p> : null}
      {libraryConfigured ? null : (
        <p className="text-sm text-muted">
          A biblioteca ainda não está configurada. O quadro funciona; criar uma peça precisa do Supabase.
        </p>
      )}
      <button
        type="button"
        disabled={!enabled || busy}
        onClick={() => onCreate(false)}
        className="w-full rounded-2xl bg-clay px-4 py-3 text-white disabled:bg-[#e4c4b4]"
      >
        {busy ? "Na fila…" : CREATE_LABEL[mode]}
      </button>
    </div>
  );
}
