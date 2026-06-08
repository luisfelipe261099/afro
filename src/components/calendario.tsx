"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Evento = { dia: string; titulo: string; quando: string };
type Bloqueio = { dia: string; motivo: string | null };

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function chave(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function Calendario({
  territorioId,
  eventos,
  bloqueios,
  podeGerenciar,
}: {
  territorioId: string;
  eventos: Evento[];
  bloqueios: Bloqueio[];
  podeGerenciar: boolean;
}) {
  const router = useRouter();
  const hoje = new Date();
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [sel, setSel] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const evMap = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of eventos) {
      const arr = m.get(e.dia) ?? [];
      arr.push(e);
      m.set(e.dia, arr);
    }
    return m;
  }, [eventos]);

  const bloqMap = useMemo(
    () => new Map(bloqueios.map((b) => [b.dia, b.motivo])),
    [bloqueios],
  );

  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ref.ano, ref.mes, 1).getDay();
  const nomeMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ref.ano, ref.mes, 1));
  const hojeKey = chave(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  function mudarMes(delta: number) {
    const d = new Date(ref.ano, ref.mes + delta, 1);
    setRef({ ano: d.getFullYear(), mes: d.getMonth() });
    setSel(null);
  }

  async function bloquear() {
    if (!sel) return;
    setBusy(true);
    await fetch(`/api/territorios/${territorioId}/bloqueios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: sel, motivo: motivo || undefined }),
    });
    setBusy(false);
    setMotivo("");
    router.refresh();
  }
  async function desbloquear() {
    if (!sel) return;
    setBusy(true);
    await fetch(`/api/territorios/${territorioId}/bloqueios?data=${sel}`, {
      method: "DELETE",
    });
    setBusy(false);
    router.refresh();
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  const evDoDia = sel ? evMap.get(sel) ?? [] : [];
  const bloqueado = sel ? bloqMap.has(sel) : false;
  const motivoBloqueio = sel ? bloqMap.get(sel) : undefined;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* Cabeçalho do mês */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => mudarMes(-1)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-base font-semibold capitalize text-foreground">
          {nomeMes}
        </span>
        <button
          onClick={() => mudarMes(1)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {SEMANA.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          if (d === null) return <div key={`v${i}`} />;
          const k = chave(ref.ano, ref.mes, d);
          const temEvento = evMap.has(k);
          const estaBloq = bloqMap.has(k);
          const ehHoje = k === hojeKey;
          const ehSel = k === sel;
          return (
            <button
              key={k}
              onClick={() => setSel(k)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                estaBloq
                  ? "bg-destructive/25 text-destructive"
                  : "hover:bg-muted text-foreground",
                ehHoje && "ring-2 ring-secondary",
                ehSel && "ring-2 ring-primary",
              )}
            >
              {d}
              {estaBloq ? (
                <Lock className="mt-0.5 h-3 w-3" />
              ) : temEvento ? (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-secondary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> com evento
        </span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-destructive" /> bloqueado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm ring-2 ring-secondary" /> hoje
        </span>
      </div>

      {/* Painel do dia selecionado */}
      {sel && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium capitalize text-foreground">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(sel + "T00:00:00"))}
          </p>

          {evDoDia.length > 0 ? (
            <ul className="mb-3 space-y-1">
              {evDoDia.map((e, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className="text-secondary">•</span> {e.titulo}{" "}
                  <span className="text-xs">({e.quando.slice(-5)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              {bloqueado ? "Dia bloqueado." : "Dia livre — nada marcado."}
            </p>
          )}

          {podeGerenciar &&
            (bloqueado ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-destructive/10 p-3">
                <span className="text-sm text-destructive">
                  <Lock className="mr-1 inline h-3.5 w-3.5" />
                  Bloqueado{motivoBloqueio ? `: ${motivoBloqueio}` : ""}
                </span>
                <button
                  onClick={desbloquear}
                  disabled={busy}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  Desbloquear
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo (ex.: viagem) — opcional"
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={bloquear}
                  disabled={busy}
                  className="rounded-xl bg-destructive/90 px-4 py-2 text-sm font-medium text-destructive-foreground hover:brightness-110 disabled:opacity-40"
                >
                  Bloquear data
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
