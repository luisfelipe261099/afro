"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, Campo, inputCls } from "@/components/ui/modal";

type Membro = { id: string; nome: string };
type Territorio = { id: string; nome: string; membros: Membro[] };

/**
 * Cria um compromisso (evento) a partir da Minha Agenda.
 * - Escolhe o TERRITÓRIO (só os que a pessoa pode editar).
 * - Escolhe o RESPONSÁVEL: por padrão "Eu" (cai na minha agenda); a liderança
 *   pode escolher outra pessoa → cai na agenda DELA.
 */
export function NovoCompromisso({
  territorios,
  meuId,
  meuNome,
  ehAdmin = false,
  todosUsuarios = [],
}: {
  territorios: Territorio[];
  meuId: string;
  meuNome: string;
  ehAdmin?: boolean;
  todosUsuarios?: Membro[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [terr, setTerr] = useState(territorios[0]?.id ?? "");
  const [f, setF] = useState({
    titulo: "",
    inicio: "",
    local: "",
    responsavel_id: meuId,
  });

  // Admin pode mandar pra QUALQUER pessoa; pessoa comum só pra si mesma.
  const opcoesResp: Membro[] = ehAdmin
    ? [
        { id: meuId, nome: `Eu (${meuNome})` },
        ...todosUsuarios.filter((m) => m.id !== meuId),
      ]
    : [{ id: meuId, nome: `Eu (${meuNome})` }];

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    const r = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        territorio_id: Number(terr),
        titulo: f.titulo,
        inicio: f.inicio.replace("T", " "),
        local: f.local || undefined,
        responsavel_id: f.responsavel_id ? Number(f.responsavel_id) : undefined,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setF({ titulo: "", inicio: "", local: "", responsavel_id: meuId });
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
        <Plus className="h-4 w-4" /> Compromisso
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo compromisso">
        <form onSubmit={salvar} className="space-y-3">
          <Campo label="Território *">
            <select
              className={inputCls}
              value={terr}
              onChange={(e) => {
                setTerr(e.target.value);
                setF({ ...f, responsavel_id: meuId });
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
              placeholder="Ex.: Reunião com a base"
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
              placeholder="Onde vai ser"
            />
          </Campo>
          {ehAdmin ? (
            <Campo label="Na agenda de">
              <select
                className={inputCls}
                value={f.responsavel_id}
                onChange={(e) => setF({ ...f, responsavel_id: e.target.value })}
              >
                {opcoesResp.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </Campo>
          ) : (
            <p className="text-xs text-muted-foreground">
              Vai pra <strong>sua</strong> agenda.
            </p>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" variant="ouro" className="w-full" disabled={busy}>
            {busy ? "Salvando…" : "Criar compromisso"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
