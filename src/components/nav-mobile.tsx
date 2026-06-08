"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, CalendarDays, ShieldCheck, Eye, BookOpen, ListChecks, LayoutDashboard } from "lucide-react";
import { SidebarTerritorios } from "@/components/sidebar-territorios";
import { BotaoSair } from "@/components/botao-sair";
import { NovoTerritorio } from "@/components/novo-territorio";

type Territorio = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  nivel_acesso: string;
  funcao: string | null;
};

/**
 * Menu de navegação para celular: botão hambúrguer + drawer lateral.
 * Fecha sozinho quando a rota muda (useEffect em pathname).
 */
export function NavMobile({
  territorios,
  papel,
  nome,
}: {
  territorios: Territorio[];
  papel: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="grid h-10 w-10 place-items-center rounded-xl text-foreground hover:bg-muted"
      >
        <Menu className="h-6 w-6" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setAberto(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold text-foreground">
                  {nome.split(" ")[0]}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{papel}</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Link
              href="/app"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <LayoutDashboard className="h-5 w-5 text-secondary" /> Início
            </Link>
            <Link
              href="/app/minha-agenda"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <CalendarDays className="h-5 w-5 text-secondary" /> Minha Agenda
            </Link>
            <Link
              href="/app/tarefas"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <ListChecks className="h-5 w-5 text-secondary" /> Tarefas
            </Link>
            <Link
              href="/app/biblioteca"
              className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <BookOpen className="h-5 w-5 text-secondary" /> Biblioteca
            </Link>

            <SidebarTerritorios territorios={territorios} />

            {papel === "lideranca" && <NovoTerritorio />}

            {papel === "lideranca" && (
              <div className="mt-4 space-y-1.5">
                <Link
                  href="/app/coletivo"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <ShieldCheck className="h-5 w-5 text-secondary" /> Coletivo &amp; Acessos
                </Link>
                <Link
                  href="/app/logs"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <Eye className="h-5 w-5 text-secondary" /> Logs de acesso
                </Link>
              </div>
            )}

            <div className="mt-auto pt-4">
              <BotaoSair />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
