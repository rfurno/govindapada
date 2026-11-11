import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl() && supabaseSecretKey());
}

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) {
    throw new Error("Supabase env vars are not set (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY)");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
