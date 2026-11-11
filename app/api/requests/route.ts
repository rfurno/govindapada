import { NextResponse } from "next/server";
import { findInflight, insertRequest, listPieces } from "@/lib/library";
import { decideEnqueue } from "@/lib/selection";
import { buildRequest } from "@/lib/request-spec";
import { hasSupabaseConfig } from "@/lib/supabase";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const payload = body as { mode?: unknown; kind?: unknown; size?: unknown; wordIds?: unknown; force?: unknown };
  const built = buildRequest(payload);
  if (!built.ok) {
    return NextResponse.json({ configured: hasSupabaseConfig(), error: built.error }, { status: 400 });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { configured: false, error: "A biblioteca ainda não está configurada." },
      { status: 503 },
    );
  }
  const force = payload.force === true;
  try {
    const [pieces, inflight] = await Promise.all([
      listPieces(built.spec.cacheKey),
      findInflight(built.spec.cacheKey),
    ]);
    const decision = decideEnqueue({ pieceCount: pieces.length, inflight: Boolean(inflight), force });
    if (decision === "show") {
      return NextResponse.json({ configured: true, decision, cacheKey: built.spec.cacheKey, pieces });
    }
    if (decision === "attach" && inflight) {
      return NextResponse.json({
        configured: true,
        decision,
        cacheKey: built.spec.cacheKey,
        request: inflight,
        pieces,
      });
    }
    const queued = await insertRequest(built.spec);
    return NextResponse.json(
      { configured: true, decision: "insert", cacheKey: built.spec.cacheKey, request: queued, pieces },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library error";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
