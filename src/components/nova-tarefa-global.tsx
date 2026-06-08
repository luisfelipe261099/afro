"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, Campo, inputCls } from "@/components/ui/modal";

type Membro = { id: string; nome: string };
type Territorio = { id: string; nome: string; membros: Membro[] };

/** Cria tarefa escolhendo o território (usado na página central de Tarefas). */
export function NovaTarefaGlobal({ territorios }: { territorios: Territorio[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [terr, setTerr] = useState(territorios[0]?.id ?? "");
  const [f, setF] = useState({ titulo: "", prioridade: "media", prazo: "" });
  const [resp, setResp] = useState<string[]>([]);

  const membros = territorios.find((t) => t.id === terr)?.membros ?? [];

  function toggle(id: string) {
    setResp((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    const r = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        territorio_id: Number(terr),
        titulo: f.titulo,
        prioridade: f.prioridade,
        prazo: f.prazo ? f.prazo.replace("T", " ") : undefined,
        responsaveis: resp.map(Number),
      }),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setF({ titulo: "", prioridade: "media", prazo: "" });
      setResp([]);
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErro(j.detalhes ?? j.erro ?? "Não rolou.");
    }
  }

  if (territorios.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="ouro" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Tarefa
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova tarefa">
        <form onSubmit={salvar} className="space-y-3">
          <Campo label="Território *">
            <select
              className={inputCls}
              value={terr}
              onChange={(e) => {
                setTerr(e.target.value);
                setResp([]);
              }}
              required
            >
              {territorios.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Título *">
            <input
              className={inputCls}
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              placeholder="Ex.: Cap. 4 do livro"
              required
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Prioridade">
              <select
                className={inputCls}
                value={f.prioridade}
                onChange={(e) => setF({ ...f, prioridade: e.target.value })}
              >
                <option value="alta">alta</option>
                <option value="media">média</option>
                <option value="baixa">baixa</option>
              </select>
            </Campo>
            <Campo label="Prazo">
              <input
                type="datetime-local"
                className={inputCls}
                value={f.prazo}
                onChange={(e) => setF({ ...f, prazo: e.target.value })}
              />
            </Campo>
          </div>
          {membros.length > 0 && (
            <Campo label="Responsáveis">
              <div className="flex flex-wrap gap-2">
                {membros.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (resp.includes(m.id)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted")
                    }
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            </Campo>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" variant="ouro" className="w-full" disabled={busy}>
            {busy ? "Salvando…" : "Criar tarefa"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
