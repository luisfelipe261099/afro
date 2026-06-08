"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: "evento" | "tarefa" | "aviso";
  lida: boolean;
  criado_em: string;
};

export function SininhoNotificacoes() {
  const [abrir, setAbrir] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const caixaRef = useRef<HTMLDivElement>(null);

  const naoLidas = itens.filter((n) => !n.lida).length;

  async function carregar() {
    try {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (r.ok) setItens((await r.json()).notificacoes ?? []);
    } catch {
      /* silencioso */
    }
  }

  // carrega ao montar e a cada 30s
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, []);

  // fecha ao clicar fora
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) {
        setAbrir(false);
      }
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  async function marcarLida(id: string) {
    setItens((xs) => xs.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await fetch(`/api/notificacoes/${id}`, { method: "PATCH" });
  }

  async function marcarTodas() {
    const pendentes = itens.filter((n) => !n.lida);
    setItens((xs) => xs.map((n) => ({ ...n, lida: true })));
    await Promise.all(
      pendentes.map((n) =>
        fetch(`/api/notificacoes/${n.id}`, { method: "PATCH" }),
      ),
    );
  }

  return (
    <div ref={caixaRef} className="relative">
      <button
        onClick={() => setAbrir((v) => !v)}
        aria-label="Notificações"
        className="relative grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {abrir && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display font-semibold text-foreground">
              Avisos do corre
            </span>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs text-secondary hover:underline"
              >
                marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {itens.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nada por aqui ainda.
              </p>
            )}
            {itens.map((n) => (
              <button
                key={n.id}
                onClick={() => marcarLida(n.id)}
                className={cn(
                  "block w-full border-b border-border px-4 py-3 text-left transition hover:bg-muted/60",
                  !n.lida && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.titulo}
                    </p>
                    {n.mensagem && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {n.mensagem}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
