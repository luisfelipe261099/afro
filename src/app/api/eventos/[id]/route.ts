import { NextResponse } from "next/server";
import { z } from "zod";
import { consultarUm, executar } from "@/lib/db";
import { usuarioAtual, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const Atualizacao = z.object({
  responsavel_id: z.coerce.number().int().positive().nullable().optional(),
  status: z
    .enum(["agendado", "confirmado", "realizado", "cancelado"])
    .optional(),
  pedir_relatorio: z.boolean().optional(),
});

/**
 * PATCH /api/eventos/:id
 * Liderança/editor: atribui responsável, muda status, ou pede relatório
 * (marca relatorio_status = 'pendente' e avisa o responsável).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const evento = await consultarUm<{
    territorio_id: string;
    titulo: string;
    responsavel_id: string | null;
  }>(
    "SELECT territorio_id, titulo, responsavel_id FROM eventos WHERE id = ?",
    [id],
  );
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });
  }
  if (!podeEditar(usuario, evento.territorio_id)) {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }

  const v = await validarCorpo(req, Atualizacao);
  if (!v.ok) return v.resposta;
  const { responsavel_id, status, pedir_relatorio } = v.dados;

  if (responsavel_id !== undefined) {
    await executar(`UPDATE eventos SET responsavel_id = ? WHERE id = ?`, [
      responsavel_id,
      id,
    ]);
    if (responsavel_id) {
      await executar(
        `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, tipo, referencia_id)
         VALUES (?, ?, ?, 'evento', ?)`,
        [responsavel_id, evento.territorio_id, `Você é responsável por: ${evento.titulo}`, id],
      );
    }
  }

  if (status) {
    await executar(`UPDATE eventos SET status = ? WHERE id = ?`, [status, id]);
  }

  if (pedir_relatorio) {
    await executar(
      `UPDATE eventos SET relatorio_status = 'pendente' WHERE id = ?`,
      [id],
    );
    const alvo = responsavel_id ?? evento.responsavel_id;
    if (alvo) {
      await executar(
        `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
         VALUES (?, ?, ?, ?, 'evento', ?)`,
        [alvo, evento.territorio_id, `Relatório solicitado: ${evento.titulo}`, "A liderança pediu o relatório deste compromisso.", id],
      );
    }
  }

  return NextResponse.json({ ok: true });
}
