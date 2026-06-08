"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Acao = { tipo: string; descricao: string; dados: Record<string, unknown> };
type Resposta = { resumo?: string; acoes?: Acao[]; erro?: string };

/**
 * Central de Comando IA — barra de comando por TEXTO ou ÁUDIO.
 *
 * Áudio: usa a Web Speech API do navegador (SpeechRecognition) para transcrever
 * a fala em pt-BR localmente, sem custo. O texto transcrito é enviado para
 * /api/comando, que aciona a IA. Isso mantém o MVP simples e barato.
 */
export function CentralComando() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const recRef = useRef<any>(null);

  async function enviar(comando: string) {
    if (!comando.trim()) return;
    setCarregando(true);
    setResposta(null);
    try {
      const r = await fetch("/api/comando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: comando }),
      });
      const dados = (await r.json()) as Resposta;
      setResposta(dados);
      setTexto("");
      // Recarrega os dados da tela (agenda/tarefas) se algo foi criado.
      if (dados.acoes && dados.acoes.length > 0) router.refresh();
    } catch {
      setResposta({ erro: "Falha de conexão" });
    } finally {
      setCarregando(false);
    }
  }

  function ditar() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Seu navegador não suporta ditado por voz.");
      return;
    }
    if (ouvindo) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setTexto(t);
    };
    rec.onend = () => setOuvindo(false);
    rec.onerror = () => setOuvindo(false);
    recRef.current = rec;
    setOuvindo(true);
    rec.start();
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-xl shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <Sparkles className="ml-1 h-5 w-5 shrink-0 text-secondary md:ml-2" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar(texto)}
            placeholder="Fala aí… ex.: agenda reunião sábado de manhã"
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none md:text-base"
          />
          <button
            onClick={ditar}
            aria-label="Ditar por voz"
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl transition",
              ouvindo
                ? "animate-pulse bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            onClick={() => enviar(texto)}
            disabled={carregando || !texto.trim()}
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradiente-ouro text-carvao transition hover:brightness-110 disabled:opacity-40"
          >
            {carregando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {resposta && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          {resposta.erro ? (
            <p className="text-destructive">{resposta.erro}</p>
          ) : (
            <>
              <p className="font-display text-lg text-foreground">
                {resposta.resumo}
              </p>
              {resposta.acoes && resposta.acoes.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {resposta.acoes.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
                      {a.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
