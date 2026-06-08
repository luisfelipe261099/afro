import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, inserir, executar } from "@/lib/db";
import { usuarioAtual, podeAcessar, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovoEvento = z.object({
  territorio_id: z.coerce.number().int().positive(),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().max(2000).optional(),
  local: z.string().max(200).optional(),
  inicio: z.string().min(1), // 'YYYY-MM-DD HH:MM:SS'
  fim: z.string().optional(),
  responsavel_id: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/eventos?territorio_id=2[&desde=YYYY-MM-DD]
 * Lista eventos de um território (com checagem de acesso).
 */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const territorioId = url.searchParams.get("territorio_id");
  const desde = url.searchParams.get("desde");

  if (!territorioId) {
    return NextResponse.json({ erro: "Informe territorio_id" }, { status: 400 });
  }
  if (!podeAcessar(usuario, territorioId)) {
    return NextResponse.json({ erro: "Sem acesso a este território" }, { status: 403 });
  }

  const eventos = await consultar(
    `SELECT id, titulo, descricao, local, inicio, fim, status
       FROM eventos
      WHERE territorio_id = ?
        AND (?::text IS NULL OR inicio >= ?::timestamp)
      ORDER BY inicio ASC`,
    [territorioId, desde, desde],
  );
  return NextResponse.json({ eventos });
}

/** POST /api/eventos — cria evento manualmente (fora da IA). */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const v = await validarCorpo(req, NovoEvento);
  if (!v.ok) return v.resposta;
  const { territorio_id, titulo, descricao, local, inicio, fim, responsavel_id } = v.dados;

  if (!podeEditar(usuario, territorio_id)) {
    return NextResponse.json(
      { erro: "Sem permissão de edição neste território" },
      { status: 403 },
    );
  }

  const id = await inserir(
    `INSERT INTO eventos (territorio_id, titulo, descricao, local, inicio, fim, responsavel_id, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [territorio_id, titulo, descricao ?? null, local ?? null, inicio, fim ?? null, responsavel_id ?? null, usuario.id],
  );
  // Avisa o responsável que tem compromisso na agenda dele.
  if (responsavel_id) {
    await executar(
      `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
       VALUES (?, ?, ?, ?, 'evento', ?)`,
      [responsavel_id, territorio_id, `Novo compromisso: ${titulo}`, local ?? null, id],
    );
  }
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
