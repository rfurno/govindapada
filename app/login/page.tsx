import { redirect } from "next/navigation";
import { authRequired, getSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-path";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (!authRequired()) {
    redirect("/");
  }
  const session = await getSession();
  const params = await searchParams;
  const next = safeNextPath(params.next ?? "/");
  if (session) {
    redirect(next);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-6">
      <section className="w-full rounded-3xl border border-line bg-card p-6">
        <p className="font-deva text-2xl text-clay">कथा</p>
        <h1 className="mt-1 text-xl">Histórias com o seu vocabulário</h1>
        <p className="mt-2 text-sm text-muted">Entre com a senha da turma.</p>
        <div className="mt-6">
          <LoginForm next={next} error={params.error} />
        </div>
      </section>
    </main>
  );
}
