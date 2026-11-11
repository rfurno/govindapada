import { NextResponse } from "next/server";
import { getRequest } from "@/lib/library";
import { hasSupabaseConfig } from "@/lib/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  const { id } = await context.params;
  try {
    const row = await getRequest(id);
    if (!row) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ configured: true, request: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
