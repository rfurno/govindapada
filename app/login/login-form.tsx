import { loginAction } from "@/app/login/actions";

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const message =
    error === "rate"
      ? "Muitas tentativas. Espere um pouco e tente de novo."
      : error
        ? "Senha incorreta."
        : null;

  return (
    <form action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm text-muted" htmlFor="password">
        Senha
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="w-full rounded-xl border border-line bg-card px-3 py-2"
      />
      {message ? <p className="text-sm text-clay-deep">{message}</p> : null}
      <button type="submit" className="w-full rounded-xl bg-clay px-4 py-2 text-white">
        Entrar
      </button>
    </form>
  );
}
