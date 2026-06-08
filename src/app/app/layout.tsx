import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CalendarDays, Eye, BookOpen, ListChecks, LayoutDashboard } from "lucide-react";
import { usuarioAtual } from "@/lib/permissions";
import { SidebarTerritorios } from "@/components/sidebar-territorios";
import { CentralComando } from "@/components/central-comando";
import { SininhoNotificacoes } from "@/components/sininho-notificacoes";
import { BotaoSair } from "@/components/botao-sair";
import { NavMobile } from "@/components/nav-mobile";
import { PadraoAfro } from "@/components/padrao-afro";
import { NovoTerritorio } from "@/components/novo-territorio";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Faixa de tecido afro no topo */}
      <PadraoAfro id="afroFaixa" className="h-6 w-full shrink-0" />

      <div className="flex flex-1">
      {/* Sidebar — só desktop */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
        <div className="mb-6">
          <p className="font-display text-lg font-bold text-foreground">
            {usuario.nome.split(" ")[0]}
          </p>
          <p className="text-xs capitalize text-muted-foreground">{usuario.papel}</p>
        </div>

        <Link
          href="/app"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
        >
          <LayoutDashboard className="h-5 w-5 text-secondary" />
          Início
        </Link>
        <Link
          href="/app/minha-agenda"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
        >
          <CalendarDays className="h-5 w-5 text-secondary" />
          Minha Agenda
        </Link>
        <Link
          href="/app/tarefas"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
        >
          <ListChecks className="h-5 w-5 text-secondary" />
          Tarefas
        </Link>
        <Link
          href="/app/biblioteca"
          className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
        >
          <BookOpen className="h-5 w-5 text-secondary" />
          Biblioteca
        </Link>

        <SidebarTerritorios territorios={usuario.territorios} />

        {usuario.papel === "lideranca" && <NovoTerritorio />}

        {usuario.papel === "lideranca" && (
          <div className="mt-4 space-y-1.5">
            <Link
              href="/app/coletivo"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
            >
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Coletivo &amp; Acessos
            </Link>
            <Link
              href="/app/logs"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
            >
              <Eye className="h-5 w-5 text-secondary" />
              Logs de acesso
            </Link>
          </div>
        )}

        <div className="mt-auto pt-4">
          <BotaoSair />
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col">
        {/* Barra única: menu (celular) + comando + sino */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur md:gap-3 md:px-6 md:py-4">
          <div className="md:hidden">
            <NavMobile
              territorios={usuario.territorios}
              papel={usuario.papel}
              nome={usuario.nome}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CentralComando />
          </div>
          <SininhoNotificacoes />
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      </div>
    </div>
  );
}
