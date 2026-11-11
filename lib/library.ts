import "server-only";

import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import type { Kind, Mode, Size } from "@/lib/types";

export type StoredPiece = {
  id: string;
  body: string;
  createdAt: string;
};

export type StoredRequest = {
  id: string;
  status: "pending" | "running" | "done" | "error";
  error: string | null;
  pieceId: string | null;
  piece: StoredPiece | null;
};

type PieceRow = {
  id: string;
  body: string;
  created_at: string;
};

type RequestRow = {
  id: string;
  status: StoredRequest["status"];
  error: string | null;
  piece_id: string | null;
  pieces: PieceRow | PieceRow[] | null;
};

function onePiece(value: RequestRow["pieces"]): PieceRow | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapPiece(row: PieceRow): StoredPiece {
  return { id: row.id, body: row.body, createdAt: row.created_at };
}

export async function listPieces(cacheKey: string): Promise<StoredPiece[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pieces")
    .select("id, body, created_at")
    .eq("cache_key", cacheKey)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as PieceRow[]).map(mapPiece);
}

export async function findInflight(cacheKey: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("requests")
    .select("id, status")
    .eq("cache_key", cacheKey)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as { id: string; status: "pending" | "running" } | null;
}

export async function insertRequest(spec: {
  cacheKey: string;
  mode: Mode;
  kind: Kind;
  size: Size | null;
  wordIds: string[];
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      cache_key: spec.cacheKey,
      mode: spec.mode,
      kind: spec.kind,
      size: spec.size,
      word_ids: spec.wordIds,
      status: "pending",
    })
    .select("id, status")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not queue the request");
  }
  return data as { id: string; status: "pending" };
}

export async function getRequest(id: string): Promise<StoredRequest | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("requests")
    .select("id, status, error, piece_id, pieces(id, body, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const row = data as RequestRow;
  const piece = onePiece(row.pieces);
  return {
    id: row.id,
    status: row.status,
    error: row.error,
    pieceId: row.piece_id,
    piece: piece ? mapPiece(piece) : null,
  };
}

export function libraryConfigured() {
  return hasSupabaseConfig();
}
