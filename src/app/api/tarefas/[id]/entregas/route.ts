import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, consultarUm, executar, inserir } from "@/lib/db";
import { usuarioAtual, podeAcessar, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovaEntrega = z.object({
  tipo: z.enum(["link", "texto"]),
  titulo: z.string().max(200).optional(),
  conteudo: z.string().trim().min(1).max(5000),
});

async function contexto(tarefaId: string, usuarioId: string) {
  const t = await consultarUm<{
    territorio_id: string;
    titulo: string;
    criado_por: string;
  }>(
    "SELECT territorio_id, titulo, criado_por FROM tarefas WHERE id = ?",
    [tarefaId],
  );
  if (!t) return null;
  const resp = await consultarUm(
    "SELECT 1 AS ok FROM tarefa_responsaveis WHERE tarefa_id = ? AND usuario_id = ?",
    [tarefaId, usuarioId],
  );
  return { ...t, ehResponsavel: !!resp };
}

/** GET /api/tarefas/:id/entregas — lista as entregas (quem acessa o território). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const ctx = await contexto(id, usuario.id);
  if (!ctx || !podeAcessar(usuario, ctx.territorio_id)) {
    return NextResponse.json({ erro: "Sem acesso" }, { status: 403 });
  }

  const entregas = await consultar(
    `SELECT e.id, e.tipo, e.titulo, e.conteudo, u.nome AS autor,
            to_char(e.criado_em, 'DD/MM/YYYY HH24:MI') AS quando
       FROM entregas e
       JOIN usuarios u ON u.id = e.autor_id
      WHERE e.tarefa_id = ?
      ORDER BY e.criado_em DESC`,
    [id],
  );
  return NextResponse.json({ entregas });
}

/** POST /api/tarefas/:id/entregas — responsável ou editor anexa link/texto. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const ctx = await contexto(id, usuario.id);
  if (!ctx) {
    return NextResponse.json({ erro: "Tarefa não encontrada" }, { status: 404 });
  }
  if (!ctx.ehResponsavel && !podeEditar(usuario, ctx.territorio_id)) {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }

  const v = await validarCorpo(req, NovaEntrega);
  if (!v.ok) return v.resposta;

  const entregaId = await inserir(
    `INSERT INTO entregas (tarefa_id, autor_id, tipo, titulo, conteudo)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [id, usuario.id, v.dados.tipo, v.dados.titulo ?? null, v.dados.conteudo],
  );

  // Avisa quem criou a tarefa que chegou entrega nova.
  if (String(ctx.criado_por) !== String(usuario.id)) {
    await executar(
      `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
       VALUES (?, ?, ?, ?, 'tarefa', ?)`,
      [ctx.criado_por, ctx.territorio_id, `Entrega em: ${ctx.titulo}`, `Por ${usuario.nome}`, id],
    );
  }

  return NextResponse.json({ ok: true, id: entregaId }, { status: 201 });
}
