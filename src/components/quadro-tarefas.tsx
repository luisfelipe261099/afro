"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Check, RotateCcw, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntregasTarefa } from "@/components/entregas-tarefa";

export type Tarefa = {
  id: string;
  titulo: string;
  prazo: string | null;
  prioridade: "baixa" | "media" | "alta";
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  responsaveis: string | null;
  sou_responsavel?: boolean;
  num_entregas?: number | string;
  // opcionais (quadro global de tarefas):
  territorio?: string;
  cor?: string;
  editavel?: boolean;
};

const tomPrioridade = { alta: "terracota", media: "ouro", baixa: "muted" } as const;

const COLUNAS = [
  { chave: "aberta", titulo: "Aberta" },
  { chave: "em_andamento", titulo: "Em andamento" },
  { chave: "concluida", titulo: "Concluída" },
] as const;

export function QuadroTarefas({
  tarefas,
  podeGerenciar = false,
}: {
  tarefas: Tarefa[];
  podeGerenciar?: boolean;
}) {
  const router = useRouter();
  const [ocupada, setOcupada] = useState<string | null>(null);

  async function mover(id: string, status: Tarefa["status"]) {
    setOcupada(id);
    await fetch(`/api/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setOcupada(null);
    router.refresh();
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
      {COLUNAS.map((col) => {
        const itens = tarefas.filter((t) => t.status === col.chave);
        return (
          <div
            key={col.chave}
            className="w-[82%] shrink-0 snap-start sm:w-full sm:shrink"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-display text-sm font-semibold text-foreground">
                {col.titulo}
              </span>
              <span className="text-xs text-muted-foreground">{itens.length}</span>
            </div>
            <div className="space-y-3">
              {itens.map((t) => {
                const podeMexer =
                  t.editavel ?? (podeGerenciar || !!t.sou_responsavel);
                return (
                <Card key={t.id} className="p-0">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-1">
                    <CardTitle className="text-base">{t.titulo}</CardTitle>
                    <Badge tom={tomPrioridade[t.prioridade]}>{t.prioridade}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4 pt-1">
                    {t.territorio && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.cor }}
                        />
                        {t.territorio}
                      </span>
                    )}
                    {(t.prazo || t.responsaveis) && (
                      <p className="text-xs text-muted-foreground">
                        {t.prazo && <>prazo: {t.prazo} </>}
                        {t.responsaveis && <>· {t.responsaveis}</>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {podeMexer && t.status === "aberta" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={ocupada === t.id}
                          onClick={() => mover(t.id, "em_andamento")}
                        >
                          <Play className="h-3.5 w-3.5" /> Iniciar
                        </Button>
                      )}
                      {podeMexer && t.status === "em_andamento" && (
                        <>
                          <Button
                            size="sm"
                            variant="ouro"
                            disabled={ocupada === t.id}
                            onClick={() => mover(t.id, "concluida")}
                          >
                            <Check className="h-3.5 w-3.5" /> Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={ocupada === t.id}
                            onClick={() => mover(t.id, "aberta")}
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Voltar
                          </Button>
                        </>
                      )}
                      {podeMexer && t.status === "concluida" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={ocupada === t.id}
                          onClick={() => mover(t.id, "aberta")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                        </Button>
                      )}
                    </div>
                    <EntregasTarefa
                      tarefaId={t.id}
                      numEntregas={Number(t.num_entregas ?? 0)}
                      podeAnexar={podeMexer}
                    />
                  </CardContent>
                </Card>
                );
              })}
              {itens.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
