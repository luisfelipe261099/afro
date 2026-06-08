"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, Campo, inputCls } from "@/components/ui/modal";

type Membro = { id: string; nome: string };

export function NovoEvento({
  territorioId,
  membros,
}: {
  territorioId: string;
  membros: Membro[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({
    titulo: "",
    inicio: "",
    local: "",
    descricao: "",
    responsavel_id: "",
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    const r = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        territorio_id: Number(territorioId),
        titulo: f.titulo,
        inicio: f.inicio.replace("T", " "), // datetime-local -> 'YYYY-MM-DD HH:MM'
        local: f.local || undefined,
        descricao: f.descricao || undefined,
        responsavel_id: f.responsavel_id ? Number(f.responsavel_id) : undefined,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setF({ titulo: "", inicio: "", local: "", descricao: "", responsavel_id: "" });
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErro(j.detalhes ?? j.erro ?? "Não rolou.");
    }
  }

  return (
    <>
      <Button size="sm" variant="ouro" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Evento
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo evento">
        <form onSubmit={salvar} className="space-y-3">
          <Campo label="Título *">
            <input
              className={inputCls}
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              placeholder="Ex.: Reunião de articulação"
              required
            />
          </Campo>
          <Campo label="Quando *">
            <input
              type="datetime-local"
              className={inputCls}
              value={f.inicio}
              onChange={(e) => setF({ ...f, inicio: e.target.value })}
              required
            />
          </Campo>
          <Campo label="Local">
            <input
              className={inputCls}
              value={f.local}
              onChange={(e) => setF({ ...f, local: e.target.value })}
              placeholder="Ex.: Casa de Cultura"
            />
          </Campo>
          <Campo label="Responsável">
            <select
              className={inputCls}
              value={f.responsavel_id}
              onChange={(e) => setF({ ...f, responsavel_id: e.target.value })}
            >
              <option value="">— ninguém —</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Descrição">
            <textarea
              className={inputCls}
              rows={3}
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="Pauta, detalhes…"
            />
          </Campo>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" variant="ouro" className="w-full" disabled={busy}>
            {busy ? "Salvando…" : "Criar evento"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
