import { NextResponse } from "next/server";
import { listPieces } from "@/lib/library";
import { buildRequest } from "@/lib/request-spec";
import { hasSupabaseConfig } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false, pieces: [] });
  }
  const url = new URL(request.url);
  const built = buildRequest({
    mode: url.searchParams.get("mode"),
    kind: url.searchParams.get("kind"),
    size: url.searchParams.get("size") ?? "media",
    wordIds: (url.searchParams.get("words") ?? "").split(",").filter(Boolean),
  });
  if (!built.ok) {
    return NextResponse.json({ configured: true, pieces: [], error: built.error }, { status: 400 });
  }
  try {
    const pieces = await listPieces(built.spec.cacheKey);
    return NextResponse.json({ configured: true, cacheKey: built.spec.cacheKey, pieces });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library error";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
