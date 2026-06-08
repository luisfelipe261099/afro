import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, consultarUm, executar, inserir } from "@/lib/db";
import { usuarioAtual, podeAcessar, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovoRelatorio = z.object({
  conteudo: z.string().trim().min(3).max(5000),
});

/** GET /api/eventos/:id/relatorio — lê os relatórios do evento (quem acessa o território). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const evento = await consultarUm<{ territorio_id: string }>(
    "SELECT territorio_id FROM eventos WHERE id = ?",
    [id],
  );
  if (!evento || !podeAcessar(usuario, evento.territorio_id)) {
    return NextResponse.json({ erro: "Sem acesso" }, { status: 403 });
  }

  const relatorios = await consultar(
    `SELECT r.id, r.conteudo, u.nome AS autor,
            to_char(r.criado_em, 'DD/MM/YYYY HH24:MI') AS quando
       FROM relatorios r
       JOIN usuarios u ON u.id = r.autor_id
      WHERE r.evento_id = ?
      ORDER BY r.criado_em DESC`,
    [id],
  );
  return NextResponse.json({ relatorios });
}

/**
 * POST /api/eventos/:id/relatorio — o responsável (ou editor) entrega o relatório.
 * Marca o evento como 'entregue' e avisa quem criou o evento (liderança).
 */
export async function POST(
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
    criado_por: string;
  }>(
    "SELECT territorio_id, titulo, responsavel_id, criado_por FROM eventos WHERE id = ?",
    [id],
  );
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });
  }
  // Pode entregar: o responsável pelo evento OU quem tem edição no território.
  const ehResponsavel = String(evento.responsavel_id) === String(usuario.id);
  if (!ehResponsavel && !podeEditar(usuario, evento.territorio_id)) {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }

  const v = await validarCorpo(req, NovoRelatorio);
  if (!v.ok) return v.resposta;

  const relatorioId = await inserir(
    `INSERT INTO relatorios (evento_id, autor_id, conteudo) VALUES (?, ?, ?) RETURNING id`,
    [id, usuario.id, v.dados.conteudo],
  );
  await executar(
    `UPDATE eventos SET relatorio_status = 'entregue' WHERE id = ?`,
    [id],
  );
  // Avisa quem criou o evento (a liderança) que o relatório chegou.
  if (String(evento.criado_por) !== String(usuario.id)) {
    await executar(
      `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
       VALUES (?, ?, ?, ?, 'evento', ?)`,
      [evento.criado_por, evento.territorio_id, `Relatório entregue: ${evento.titulo}`, `Por ${usuario.nome}`, id],
    );
  }

  return NextResponse.json({ ok: true, id: relatorioId }, { status: 201 });
}
