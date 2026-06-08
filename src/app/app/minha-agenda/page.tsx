import { redirect } from "next/navigation";
import { CalendarDays, MapPin, ListChecks } from "lucide-react";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { registrarAcesso } from "@/lib/logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcoesEvento } from "@/components/acoes-evento";
import { Calendario } from "@/components/calendario";
import { QuadroTarefas, type Tarefa } from "@/components/quadro-tarefas";
import { NovoCompromisso } from "@/components/novo-compromisso";

type MeuEvento = {
  id: string;
  titulo: string;
  local: string | null;
  quando: string;
  dia: string;
  relatorio_status: "nao_solicitado" | "pendente" | "entregue";
  responsavel_id: string | null;
  territorio: string;
  cor: string;
};

export default async function MinhaAgendaPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  await registrarAcesso(usuario.id, "viu_minha_agenda");

  const eventos = await consultar<MeuEvento>(
    `SELECT e.id, e.titulo, e.local, e.relatorio_status, e.responsavel_id,
            to_char(e.inicio, 'DD/MM/YYYY HH24:MI') AS quando,
            to_char(e.inicio, 'YYYY-MM-DD') AS dia,
            t.nome AS territorio, t.cor
       FROM eventos e
       JOIN territorios t ON t.id = e.territorio_id
      WHERE e.responsavel_id = ?
      ORDER BY e.inicio ASC`,
    [usuario.id],
  );

  const tarefas = await consultar<Tarefa>(
    `SELECT t.id, t.titulo, t.prioridade, t.status,
            to_char(t.prazo, 'DD/MM HH24:MI') AS prazo,
            STRING_AGG(DISTINCT u.nome, ', ') AS responsaveis,
            TRUE AS sou_responsavel,
            COUNT(DISTINCT e.id) AS num_entregas
       FROM tarefas t
       JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id AND tr.usuario_id = ?
       LEFT JOIN tarefa_responsaveis tr2 ON tr2.tarefa_id = t.id
       LEFT JOIN usuarios u ON u.id = tr2.usuario_id
       LEFT JOIN entregas e ON e.tarefa_id = t.id
      GROUP BY t.id
      ORDER BY t.criado_em DESC`,
    [usuario.id],
  );

  // Territórios onde posso criar compromisso (+ membros, p/ escolher responsável).
  const editaveis = usuario.territorios.filter((t) => t.nivel_acesso !== "leitor");
  const territoriosComMembros = [];
  for (const t of editaveis) {
    const membros = await consultar<{ id: string; nome: string }>(
      `SELECT u.id, u.nome
         FROM coletivo_permissoes cp
         JOIN usuarios u ON u.id = cp.usuario_id
        WHERE cp.territorio_id = ?
        ORDER BY u.nome`,
      [t.id],
    );
    territoriosComMembros.push({ id: t.id, nome: t.nome, membros });
  }

  // Admin (liderança) pode marcar na agenda de qualquer pessoa.
  const ehAdmin = usuario.papel === "lideranca";
  const todosUsuarios = ehAdmin
    ? await consultar<{ id: string; nome: string }>(
        "SELECT id, nome FROM usuarios WHERE ativo = TRUE ORDER BY nome",
      )
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <CalendarDays className="h-6 w-6 text-secondary" /> Minha Agenda
        </h1>
        <NovoCompromisso
          territorios={territoriosComMembros}
          meuId={usuario.id}
          meuNome={usuario.nome}
          ehAdmin={ehAdmin}
          todosUsuarios={todosUsuarios}
        />
      </div>

      {/* Calendário pessoal (só leitura) */}
      <div className="mb-8">
        <Calendario
          territorioId=""
          eventos={eventos.map((e) => ({
            dia: e.dia,
            titulo: e.titulo,
            quando: e.quando,
          }))}
          bloqueios={[]}
          podeGerenciar={false}
        />
      </div>

      {/* Meus compromissos */}
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
        <CalendarDays className="h-5 w-5 text-secondary" /> Meus compromissos
      </h2>
      {eventos.length === 0 && (
        <p className="mb-8 text-sm text-muted-foreground">
          Nenhum compromisso ainda. Crie um com <strong>＋ Compromisso</strong> ali em cima.
        </p>
      )}
      <div className="mb-8 space-y-3">
        {eventos.map((ev) => (
          <Card key={ev.id} className="overflow-hidden p-0">
            <div className="flex">
              <span className="w-1.5 shrink-0" style={{ backgroundColor: ev.cor }} />
              <div className="flex-1">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle>{ev.titulo}</CardTitle>
                  <span className="text-xs text-muted-foreground">{ev.territorio}</span>
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
                  <AcoesEvento
                    evento={{
                      id: ev.id,
                      relatorio_status: ev.relatorio_status,
                      responsavel_id: ev.responsavel_id,
                      responsavel: usuario.nome,
                    }}
                    ehLider={false}
                    souResponsavel={true}
                    membros={[]}
                  />
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Minhas tarefas — quadro (Trello) */}
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
        <ListChecks className="h-5 w-5 text-secondary" /> Minhas Tarefas
      </h2>
      {tarefas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma demanda atribuída a você por enquanto.
        </p>
      ) : (
        <QuadroTarefas tarefas={tarefas} podeGerenciar={false} />
      )}
    </div>
  );
}
