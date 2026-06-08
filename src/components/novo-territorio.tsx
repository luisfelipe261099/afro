"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal, Campo, inputCls } from "@/components/ui/modal";

const CORES = ["#C2410C", "#B45309", "#D4A017", "#9A3412", "#2E8B57", "#C81D6B"];

export function NovoTerritorio() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({ nome: "", descricao: "", cor: CORES[0] });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    const r = await fetch("/api/territorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: f.nome,
        descricao: f.descricao || undefined,
        cor: f.cor,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setF({ nome: "", descricao: "", cor: CORES[0] });
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErro(j.detalhes ?? j.erro ?? "Não rolou.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Novo território
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo território">
        <form onSubmit={salvar} className="space-y-3">
          <Campo label="Nome *">
            <input
              className={inputCls}
              value={f.nome}
              onChange={(e) => setF({ ...f, nome: e.target.value })}
              placeholder="Ex.: Coletivo de Mulheres"
              required
            />
          </Campo>
          <Campo label="Descrição">
            <input
              className={inputCls}
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="Sobre o que é esse território"
            />
          </Campo>
          <Campo label="Cor">
            <div className="flex gap-2">
              {CORES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setF({ ...f, cor: c })}
                  className={
                    "h-8 w-8 rounded-full ring-2 transition " +
                    (f.cor === c ? "ring-foreground" : "ring-transparent")
                  }
                  style={{ backgroundColor: c }}
                  aria-label={`cor ${c}`}
                />
              ))}
            </div>
          </Campo>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradiente-ouro py-2.5 text-sm font-medium text-carvao transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Criando…" : "Criar território"}
          </button>
        </form>
      </Modal>
    </>
  );
}
