import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { registrarAcesso } from "@/lib/logs";
import { QuadroTarefas, type Tarefa } from "@/components/quadro-tarefas";
import { NovaTarefaGlobal } from "@/components/nova-tarefa-global";

type Linha = Tarefa & { territorio_id: string };

export default async function TarefasPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  await registrarAcesso(usuario.id, "viu_tarefas");

  const ids = usuario.territorios.map((t) => t.id);

  const linhas =
    ids.length === 0
      ? []
      : await consultar<Linha>(
          `SELECT t.id, t.titulo, t.prioridade, t.status, t.territorio_id,
                  to_char(t.prazo, 'DD/MM HH24:MI') AS prazo,
                  ter.nome AS territorio, ter.cor,
                  STRING_AGG(DISTINCT u.nome, ', ') AS responsaveis,
                  bool_or(tr.usuario_id = ?) AS sou_responsavel,
                  COUNT(DISTINCT e.id) AS num_entregas
             FROM tarefas t
             JOIN territorios ter ON ter.id = t.territorio_id
             LEFT JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id
             LEFT JOIN usuarios u ON u.id = tr.usuario_id
             LEFT JOIN entregas e ON e.tarefa_id = t.id
            WHERE t.territorio_id IN (${ids.map(() => "?").join(",")})
            GROUP BY t.id, ter.nome, ter.cor
            ORDER BY t.criado_em DESC`,
          [usuario.id, ...ids],
        );

  // marca quem pode mover/anexar (editor do território OU responsável)
  const nivel = new Map(
    usuario.territorios.map((t) => [String(t.id), t.nivel_acesso]),
  );
  const tarefas: Tarefa[] = linhas.map((t) => ({
    ...t,
    editavel: nivel.get(String(t.territorio_id)) !== "leitor" || !!t.sou_responsavel,
  }));

  // territórios onde posso criar tarefa (+ membros pra escolher responsáveis)
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <ListChecks className="h-6 w-6 text-secondary" /> Tarefas
        </h1>
        <NovaTarefaGlobal territorios={territoriosComMembros} />
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Todas as demandas dos seus territórios num quadro só.
      </p>

      {tarefas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa ainda. Crie uma com <strong>＋ Tarefa</strong>.
        </p>
      ) : (
        <QuadroTarefas tarefas={tarefas} />
      )}
    </div>
  );
}
