"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Send, UserCog, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Membro = { id: string; nome: string };
type Relatorio = { id: string; conteudo: string; autor: string; quando: string };

export type EventoAcoes = {
  id: string;
  relatorio_status: "nao_solicitado" | "pendente" | "entregue";
  responsavel_id: string | null;
  responsavel: string | null;
};

export function AcoesEvento({
  evento,
  ehLider,
  souResponsavel,
  membros,
}: {
  evento: EventoAcoes;
  ehLider: boolean;
  souResponsavel: boolean;
  membros: Membro[];
}) {
  const router = useRouter();
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [relatorios, setRelatorios] = useState<Relatorio[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function atribuir(responsavel_id: string) {
    await fetch(`/api/eventos/${evento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel_id: responsavel_id ? Number(responsavel_id) : null }),
    });
    router.refresh();
  }

  async function pedirRelatorio() {
    setBusy(true);
    await fetch(`/api/eventos/${evento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedir_relatorio: true }),
    });
    setBusy(false);
    router.refresh();
  }

  async function enviarRelatorio() {
    if (texto.trim().length < 3) return;
    setBusy(true);
    await fetch(`/api/eventos/${evento.id}/relatorio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: texto }),
    });
    setBusy(false);
    setEscrevendo(false);
    setTexto("");
    router.refresh();
  }

  async function verRelatorios() {
    const r = await fetch(`/api/eventos/${evento.id}/relatorio`);
    if (r.ok) setRelatorios((await r.json()).relatorios ?? []);
  }

  const status = evento.relatorio_status;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {/* Responsável */}
      <div className="flex items-center gap-2 text-sm">
        <UserCog className="h-4 w-4 text-muted-foreground" />
        {ehLider ? (
          <select
            value={evento.responsavel_id ?? ""}
            onChange={(e) => atribuir(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">— sem responsável —</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-foreground/80">
            {evento.responsavel ? `Responsável: ${evento.responsavel}` : "Sem responsável"}
          </span>
        )}

        {status === "pendente" && <Badge tom="ocre">relatório pendente</Badge>}
        {status === "entregue" && (
          <Badge tom="folha">
            <ClipboardCheck className="mr-1 h-3 w-3" /> relatório entregue
          </Badge>
        )}
      </div>

      {/* Ações de relatório */}
      <div className="flex flex-wrap gap-2">
        {ehLider && status === "nao_solicitado" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={pedirRelatorio}>
            <FileText className="h-3.5 w-3.5" /> Pedir relatório
          </Button>
        )}

        {(souResponsavel || ehLider) && status === "pendente" && !escrevendo && (
          <Button size="sm" variant="ouro" onClick={() => setEscrevendo(true)}>
            <Send className="h-3.5 w-3.5" /> Enviar relatório
          </Button>
        )}

        {status === "entregue" && relatorios === null && (
          <Button size="sm" variant="ghost" onClick={verRelatorios}>
            <FileText className="h-3.5 w-3.5" /> Ver relatório
          </Button>
        )}
      </div>

      {/* Formulário de relatório */}
      {escrevendo && (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Como foi a aula/compromisso? Presença, o que rolou, encaminhamentos…"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ouro" disabled={busy} onClick={enviarRelatorio}>
              {busy ? "Enviando…" : "Entregar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEscrevendo(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Relatórios entregues */}
      {relatorios && relatorios.length > 0 && (
        <div className="space-y-2">
          {relatorios.map((r) => (
            <div key={r.id} className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">
                {r.autor} · {r.quando}
              </p>
              <p className="whitespace-pre-wrap text-foreground/90">{r.conteudo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
