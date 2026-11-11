import { KathaApp } from "@/components/katha-app";
import { authRequired } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase";

export default function HomePage() {
  return <KathaApp libraryConfigured={hasSupabaseConfig()} showLogout={authRequired()} />;
}
