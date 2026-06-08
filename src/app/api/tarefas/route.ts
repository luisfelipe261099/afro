import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, executar, inserir } from "@/lib/db";
import { usuarioAtual, podeAcessar, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovaTarefa = z.object({
  territorio_id: z.coerce.number().int().positive(),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().max(2000).optional(),
  prazo: z.string().optional(),
  prioridade: z.enum(["baixa", "media", "alta"]).optional(),
  responsaveis: z.array(z.coerce.number().int().positive()).optional(),
});

/** GET /api/tarefas?territorio_id=3[&status=aberta] */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const territorioId = url.searchParams.get("territorio_id");
  const status = url.searchParams.get("status");

  if (!territorioId) {
    return NextResponse.json({ erro: "Informe territorio_id" }, { status: 400 });
  }
  if (!podeAcessar(usuario, territorioId)) {
    return NextResponse.json({ erro: "Sem acesso a este território" }, { status: 403 });
  }

  const tarefas = await consultar(
    `SELECT t.id, t.titulo, t.descricao, t.prazo, t.prioridade, t.status,
            STRING_AGG(u.nome, ', ') AS responsaveis
       FROM tarefas t
       LEFT JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id
       LEFT JOIN usuarios u ON u.id = tr.usuario_id
      WHERE t.territorio_id = ?
        AND (?::text IS NULL OR t.status = ?)
      GROUP BY t.id
      ORDER BY t.criado_em DESC`,
    [territorioId, status, status],
  );
  return NextResponse.json({ tarefas });
}

/** POST /api/tarefas — cria tarefa manualmente, com responsáveis opcionais. */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const v = await validarCorpo(req, NovaTarefa);
  if (!v.ok) return v.resposta;
  const { territorio_id, titulo, descricao, prazo, prioridade, responsaveis } = v.dados;

  if (!podeEditar(usuario, territorio_id)) {
    return NextResponse.json(
      { erro: "Sem permissão de edição neste território" },
      { status: 403 },
    );
  }

  const tarefaId = await inserir(
    `INSERT INTO tarefas (territorio_id, titulo, descricao, prazo, prioridade, criado_por)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [territorio_id, titulo, descricao ?? null, prazo ?? null, prioridade ?? "media", usuario.id],
  );

  for (const uid of responsaveis ?? []) {
    await executar(
      `INSERT INTO tarefa_responsaveis (tarefa_id, usuario_id) VALUES (?, ?)
       ON CONFLICT (tarefa_id, usuario_id) DO NOTHING`,
      [tarefaId, uid],
    );
    // Avisa o responsável (cai no sininho dele).
    await executar(
      `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
       VALUES (?, ?, ?, ?, 'tarefa', ?)`,
      [uid, territorio_id, `Nova tarefa: ${titulo}`, descricao ?? null, tarefaId],
    );
  }

  return NextResponse.json({ ok: true, id: tarefaId }, { status: 201 });
}
