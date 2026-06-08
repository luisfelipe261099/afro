"use client";

import { useState } from "react";
import { Paperclip, Link2, FileText, Plus } from "lucide-react";

type Entrega = {
  id: string;
  tipo: "link" | "texto";
  titulo: string | null;
  conteudo: string;
  autor: string;
  quando: string;
};

export function EntregasTarefa({
  tarefaId,
  numEntregas,
  podeAnexar,
}: {
  tarefaId: string;
  numEntregas: number;
  podeAnexar: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Entrega[] | null>(null);
  const [tipo, setTipo] = useState<"link" | "texto">("link");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(numEntregas);

  async function carregar() {
    const r = await fetch(`/api/tarefas/${tarefaId}/entregas`);
    if (r.ok) {
      const data = (await r.json()).entregas ?? [];
      setItens(data);
      setTotal(data.length);
    }
  }

  async function abrir() {
    const novo = !aberto;
    setAberto(novo);
    if (novo && itens === null) await carregar();
  }

  async function anexar(e: React.FormEvent) {
    e.preventDefault();
    if (!conteudo.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/tarefas/${tarefaId}/entregas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, titulo: titulo || undefined, conteudo }),
    });
    setBusy(false);
    if (r.ok) {
      setTitulo("");
      setConteudo("");
      await carregar();
    }
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={abrir}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Paperclip className="h-3.5 w-3.5" />
        Entregas {total > 0 && <span className="text-secondary">({total})</span>}
      </button>

      {aberto && (
        <div className="mt-2 space-y-2">
          {itens?.map((it) => (
            <div key={it.id} className="rounded-lg bg-muted/50 p-2 text-xs">
              {it.tipo === "link" ? (
                <a
                  href={it.conteudo}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium text-secondary hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{it.titulo || it.conteudo}</span>
                </a>
              ) : (
                <div className="flex items-start gap-1.5 text-foreground/90">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-pre-wrap">{it.conteudo}</span>
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {it.autor} · {it.quando}
              </p>
            </div>
          ))}
          {itens && itens.length === 0 && (
            <p className="text-xs text-muted-foreground">Nada entregue ainda.</p>
          )}

          {podeAnexar && (
            <form onSubmit={anexar} className="space-y-1.5">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTipo("link")}
                  className={
                    "rounded-md px-2 py-1 text-[11px] " +
                    (tipo === "link" ? "bg-primary/20 text-primary" : "text-muted-foreground")
                  }
                >
                  <Link2 className="mr-1 inline h-3 w-3" />link
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("texto")}
                  className={
                    "rounded-md px-2 py-1 text-[11px] " +
                    (tipo === "texto" ? "bg-primary/20 text-primary" : "text-muted-foreground")
                  }
                >
                  <FileText className="mr-1 inline h-3 w-3" />texto
                </button>
              </div>
              {tipo === "link" ? (
                <input
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Cole o link do documento (https://…)"
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  rows={2}
                  placeholder="Escreva o texto / nota da entrega…"
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1 rounded-lg bg-gradiente-ouro px-2.5 py-1 text-[11px] font-medium text-carvao disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> {busy ? "Enviando…" : "Anexar"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
