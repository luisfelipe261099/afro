"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Membro = {
  id: string;
  nome: string;
  email: string;
  papel: "lideranca" | "assessor";
  ativo: boolean;
};

type LinhaPermissao = {
  territorio_id: string;
  nome: string;
  cor: string;
  nivel_acesso: string | null;
  funcao: string | null;
  tem_acesso: boolean;
};

export function GestaoColetivo({ membros }: { membros: Membro[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState<Membro | null>(null);
  const [linhas, setLinhas] = useState<LinhaPermissao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ nome: "", email: "", senha: "" });
  const [erroNovo, setErroNovo] = useState("");

  async function abrirMembro(m: Membro) {
    setAberto(m);
    setLinhas([]);
    const r = await fetch(`/api/coletivo/${m.id}/permissoes`);
    if (r.ok) setLinhas((await r.json()).permissoes ?? []);
  }

  function atualizar(territorioId: string, patch: Partial<LinhaPermissao>) {
    setLinhas((xs) =>
      xs.map((l) => (l.territorio_id === territorioId ? { ...l, ...patch } : l)),
    );
  }

  async function salvarPermissoes() {
    if (!aberto) return;
    setSalvando(true);
    for (const l of linhas) {
      if (l.tem_acesso) {
        await fetch("/api/permissoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario_id: Number(aberto.id),
            territorio_id: Number(l.territorio_id),
            nivel_acesso: l.nivel_acesso ?? "editor",
            funcao: l.funcao || null,
          }),
        });
      } else {
        await fetch(
          `/api/permissoes?usuario_id=${aberto.id}&territorio_id=${l.territorio_id}`,
          { method: "DELETE" },
        );
      }
    }
    setSalvando(false);
    setAberto(null);
    router.refresh();
  }

  async function adicionarMembro(e: React.FormEvent) {
    e.preventDefault();
    setErroNovo("");
    const r = await fetch("/api/coletivo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novo, papel: "assessor" }),
    });
    if (r.ok) {
      setNovo({ nome: "", email: "", senha: "" });
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErroNovo(j.detalhes ?? j.erro ?? "Não rolou.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
        <ShieldCheck className="h-6 w-6 text-secondary" /> Coletivo & Acessos
      </h1>

      {/* Cadastrar novo membro */}
      <form
        onSubmit={adicionarMembro}
        className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          placeholder="Nome"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <input
          type="email"
          value={novo.email}
          onChange={(e) => setNovo({ ...novo, email: e.target.value })}
          placeholder="e-mail"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <input
          type="password"
          value={novo.senha}
          onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
          placeholder="senha (min. 6)"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <Button type="submit" variant="ouro">
          <UserPlus className="h-4 w-4" /> Add
        </Button>
        {erroNovo && (
          <p className="text-sm text-destructive sm:col-span-4">{erroNovo}</p>
        )}
      </form>

      {/* Lista de membros */}
      <div className="overflow-hidden rounded-2xl border border-border">
        {membros.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-0"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradiente-ouro font-display text-sm font-bold text-carvao">
                {m.nome.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{m.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.papel === "lideranca" && (
                <Badge tom="terracota" className="shrink-0">
                  liderança
                </Badge>
              )}
            </div>
            {m.papel !== "lideranca" && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => abrirMembro(m)}
              >
                <span className="hidden sm:inline">Gerenciar acesso</span>
                <span className="sm:hidden">Acesso</span>
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Painel lateral de permissões */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {aberto.nome}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Defina a quais Territórios este membro tem acesso.
                </p>
              </div>
              <button
                onClick={() => setAberto(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {linhas.map((l) => (
                <div
                  key={l.territorio_id}
                  className="rounded-xl border border-border p-3"
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l.tem_acesso}
                      onChange={(e) =>
                        atualizar(l.territorio_id, {
                          tem_acesso: e.target.checked,
                          nivel_acesso: l.nivel_acesso ?? "editor",
                        })
                      }
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    <span
                      className="h-5 w-5 rounded-full ring-2 ring-black/20"
                      style={{ backgroundColor: l.cor }}
                    />
                    <span className="font-medium text-foreground">{l.nome}</span>
                  </label>

                  {l.tem_acesso && (
                    <div className="mt-3 grid grid-cols-2 gap-2 pl-7">
                      <select
                        value={l.nivel_acesso ?? "editor"}
                        onChange={(e) =>
                          atualizar(l.territorio_id, { nivel_acesso: e.target.value })
                        }
                        className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="admin">admin</option>
                        <option value="editor">editor</option>
                        <option value="leitor">leitor</option>
                      </select>
                      <input
                        value={l.funcao ?? ""}
                        onChange={(e) =>
                          atualizar(l.territorio_id, { funcao: e.target.value })
                        }
                        placeholder="função (ex.: comunicacao)"
                        className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
              {linhas.length === 0 && (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              )}
            </div>

            <Button
              variant="ouro"
              className="mt-6 w-full"
              onClick={salvarPermissoes}
              disabled={salvando}
            >
              {salvando ? "Salvando…" : "Salvar acesso"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
