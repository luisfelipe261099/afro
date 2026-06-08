import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, inserir } from "@/lib/db";
import { gerarHash } from "@/lib/auth";
import { usuarioAtual } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovoMembro = z.object({
  nome: z.string().trim().min(1).max(160),
  email: z.string().email().max(190),
  senha: z.string().min(6).max(100),
  papel: z.enum(["lideranca", "assessor"]).optional(),
  telefone: z.string().max(40).optional(),
});

/**
 * GET /api/coletivo[?territorio_id=2]
 * Sem filtro: lista todos os membros (visão da liderança).
 * Com territorio_id: lista o coletivo daquele território (se o operador acessa).
 */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const territorioId = new URL(req.url).searchParams.get("territorio_id");

  if (territorioId) {
    if (!usuario.territorios.some((t) => String(t.id) === territorioId)) {
      return NextResponse.json({ erro: "Sem acesso a este território" }, { status: 403 });
    }
    const membros = await consultar(
      `SELECT u.id, u.nome, u.email, u.papel, cp.nivel_acesso, cp.funcao
         FROM coletivo_permissoes cp
         JOIN usuarios u ON u.id = cp.usuario_id
        WHERE cp.territorio_id = ?
        ORDER BY u.nome`,
      [territorioId],
    );
    return NextResponse.json({ membros });
  }

  if (usuario.papel !== "lideranca") {
    return NextResponse.json({ erro: "Informe territorio_id" }, { status: 400 });
  }
  const membros = await consultar(
    `SELECT id, nome, email, papel, ativo FROM usuarios ORDER BY nome`,
  );
  return NextResponse.json({ membros });
}

/**
 * POST /api/coletivo — só a liderança cadastra novos membros do coletivo.
 * Body: { nome, email, senha, papel?, telefone? }
 */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  if (usuario.papel !== "lideranca") {
    return NextResponse.json(
      { erro: "Apenas a liderança pode cadastrar membros" },
      { status: 403 },
    );
  }

  const v = await validarCorpo(req, NovoMembro);
  if (!v.ok) return v.resposta;
  const { nome, email, senha, papel, telefone } = v.dados;

  const hash = await gerarHash(senha);
  const id = await inserir(
    `INSERT INTO usuarios (nome, email, senha_hash, papel, telefone)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [nome, email, hash, papel === "lideranca" ? "lideranca" : "assessor", telefone ?? null],
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
