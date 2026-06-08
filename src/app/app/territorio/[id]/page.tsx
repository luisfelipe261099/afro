import { redirect } from "next/navigation";
import { CalendarDays, MapPin, ListChecks } from "lucide-react";
import { consultar } from "@/lib/db";
import { usuarioAtual, podeAcessar } from "@/lib/permissions";
import { registrarAcesso } from "@/lib/logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuadroTarefas, type Tarefa } from "@/components/quadro-tarefas";
import { AcoesEvento } from "@/components/acoes-evento";
import { NovoEvento } from "@/components/novo-evento";
import { NovaTarefa } from "@/components/nova-tarefa";
import { Calendario } from "@/components/calendario";

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  quando: string;
  dia: string;
  status: "agendado" | "confirmado" | "realizado" | "cancelado";
  relatorio_status: "nao_solicitado" | "pendente" | "entregue";
  responsavel_id: string | null;
  responsavel: string | null;
};

const tomStatus = {
  agendado: "ocre",
  confirmado: "folha",
  realizado: "muted",
  cancelado: "destructive",
} as const;

export default async function TerritorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const { id } = await params;
  if (!podeAcessar(usuario, id)) redirect("/app");

  const territorio = usuario.territorios.find((t) => String(t.id) === id)!;
  const podeGerenciar = territorio.nivel_acesso !== "leitor";

  // Auditoria: registra que este usuário visualizou o território.
  await registrarAcesso(usuario.id, "viu_territorio", id, territorio.nome);

  const eventos = await consultar<Evento>(
    `SELECT e.id, e.titulo, e.descricao, e.local,
            to_char(e.inicio, 'DD/MM/YYYY HH24:MI') AS quando,
            to_char(e.inicio, 'YYYY-MM-DD') AS dia, e.status,
            e.relatorio_status, e.responsavel_id, u.nome AS responsavel
       FROM eventos e
       LEFT JOIN usuarios u ON u.id = e.responsavel_id
      WHERE e.territorio_id = ?
      ORDER BY e.inicio ASC
      LIMIT 200`,
    [id],
  );

  const bloqueios = await consultar<{ dia: string; motivo: string | null }>(
    `SELECT to_char(data, 'YYYY-MM-DD') AS dia, motivo
       FROM bloqueios_agenda
      WHERE territorio_id = ?
      ORDER BY data`,
    [id],
  );

  const membros = await consultar<{ id: string; nome: string }>(
    `SELECT u.id, u.nome
       FROM coletivo_permissoes cp
       JOIN usuarios u ON u.id = cp.usuario_id
      WHERE cp.territorio_id = ?
      ORDER BY u.nome`,
    [id],
  );

  const tarefas = await consultar<Tarefa>(
    `SELECT t.id, t.titulo, t.prioridade, t.status,
            to_char(t.prazo, 'DD/MM HH24:MI') AS prazo,
            STRING_AGG(DISTINCT u.nome, ', ') AS responsaveis,
            bool_or(tr.usuario_id = ?) AS sou_responsavel,
            COUNT(DISTINCT e.id) AS num_entregas
       FROM tarefas t
       LEFT JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id
       LEFT JOIN usuarios u ON u.id = tr.usuario_id
       LEFT JOIN entregas e ON e.tarefa_id = t.id
      WHERE t.territorio_id = ?
      GROUP BY t.id
      ORDER BY t.criado_em DESC
      LIMIT 100`,
    [usuario.id, id],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="h-9 w-9 rounded-full ring-2 ring-black/20"
          style={{ backgroundColor: territorio.cor }}
        />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {territorio.nome}
          </h1>
          {territorio.descricao && (
            <p className="text-sm text-muted-foreground">{territorio.descricao}</p>
          )}
        </div>
      </div>

      {/* Calendário */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
          <CalendarDays className="h-5 w-5 text-secondary" /> Calendário
        </h2>
        <Calendario
          territorioId={id}
          eventos={eventos.map((e) => ({
            dia: e.dia,
            titulo: e.titulo,
            quando: e.quando,
          }))}
          bloqueios={bloqueios}
          podeGerenciar={podeGerenciar}
        />
      </section>

      {/* Agenda */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
            <CalendarDays className="h-5 w-5 text-secondary" /> Agenda
          </h2>
          {podeGerenciar && <NovoEvento territorioId={id} membros={membros} />}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {eventos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nada marcado ainda. Use a Central de Comando lá em cima.
            </p>
          )}
          {eventos.map((ev) => (
            <Card key={ev.id} className="overflow-hidden p-0">
              <div className="flex">
                <span
                  className="w-1.5 shrink-0"
                  style={{ backgroundColor: territorio.cor }}
                />
                <div className="flex-1">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle>{ev.titulo}</CardTitle>
                    <Badge tom={tomStatus[ev.status]}>{ev.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" /> {ev.quando}
                    </p>
                    {ev.local && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {ev.local}
                      </p>
                    )}
                    {ev.descricao && (
                      <p className="pt-1 text-foreground/80">{ev.descricao}</p>
                    )}
                    <AcoesEvento
                      evento={{
                        id: ev.id,
                        relatorio_status: ev.relatorio_status,
                        responsavel_id: ev.responsavel_id,
                        responsavel: ev.responsavel,
                      }}
                      ehLider={podeGerenciar}
                      souResponsavel={String(ev.responsavel_id) === String(usuario.id)}
                      membros={membros}
                    />
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Tarefas — quadro interativo */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
            <ListChecks className="h-5 w-5 text-secondary" /> Tarefas do Coletivo
          </h2>
          {podeGerenciar && <NovaTarefa territorioId={id} membros={membros} />}
        </div>
        {tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa por aqui.</p>
        ) : (
          <QuadroTarefas tarefas={tarefas} podeGerenciar={podeGerenciar} />
        )}
      </section>
    </div>
  );
}
