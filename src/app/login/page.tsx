"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PadraoAfro } from "@/components/padrao-afro";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    setCarregando(false);
    if (r.ok) {
      router.push("/app");
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErro(j.erro ?? "Não rolou. Confere os dados.");
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <PadraoAfro id="afroLogin" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-carvao/80" />
      <form
        onSubmit={entrar}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/90 p-7 shadow-2xl backdrop-blur"
      >
        <h1 className="font-display text-2xl font-bold text-foreground">
          Entrar no corre
        </h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          Acesse seus Territórios e seu Coletivo.
        </p>

        <label className="mb-1 block text-sm text-muted-foreground">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="voce@coletivo.org"
          required
        />

        <label className="mb-1 block text-sm text-muted-foreground">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-5 w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />

        {erro && <p className="mb-4 text-sm text-destructive">{erro}</p>}

        <Button type="submit" variant="ouro" size="lg" className="w-full" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
