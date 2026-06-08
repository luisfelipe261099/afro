import { NextResponse } from "next/server";
import { z } from "zod";
import { consultarUm, executar } from "@/lib/db";
import { usuarioAtual, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const Atualizacao = z.object({
  status: z
    .enum(["aberta", "em_andamento", "concluida", "cancelada"])
    .optional(),
  prioridade: z.enum(["baixa", "media", "alta"]).optional(),
});

/** PATCH /api/tarefas/:id — muda status/prioridade (precisa de edição no território). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  // Descobre o território da tarefa para validar a permissão.
  const tarefa = await consultarUm<{ territorio_id: string }>(
    "SELECT territorio_id FROM tarefas WHERE id = ?",
    [id],
  );
  if (!tarefa) {
    return NextResponse.json({ erro: "Tarefa não encontrada" }, { status: 404 });
  }
  // Pode mexer: editor do território OU responsável pela tarefa.
  const ehResponsavel = await consultarUm(
    "SELECT 1 AS ok FROM tarefa_responsaveis WHERE tarefa_id = ? AND usuario_id = ?",
    [id, usuario.id],
  );
  if (!ehResponsavel && !podeEditar(usuario, tarefa.territorio_id)) {
    return NextResponse.json(
      { erro: "Sem permissão de edição neste território" },
      { status: 403 },
    );
  }

  const v = await validarCorpo(req, Atualizacao);
  if (!v.ok) return v.resposta;
  const { status, prioridade } = v.dados;

  await executar(
    `UPDATE tarefas
        SET status = COALESCE(?, status),
            prioridade = COALESCE(?, prioridade),
            atualizado_em = now()
      WHERE id = ?`,
    [status ?? null, prioridade ?? null, id],
  );
  return NextResponse.json({ ok: true });
}
