import { NextResponse } from "next/server";
import { z } from "zod";
import { consultar, executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovaPermissao = z.object({
  usuario_id: z.coerce.number().int().positive(),
  territorio_id: z.coerce.number().int().positive(),
  nivel_acesso: z.enum(["admin", "editor", "leitor"]).optional(),
  funcao: z.string().max(60).optional(),
});

/**
 * POST /api/permissoes — concede/atualiza o acesso de um membro a um território.
 * É aqui que o líder define "quem vê o quê". Só a liderança dona do território.
 * Body: { usuario_id, territorio_id, nivel_acesso?, funcao? }
 */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  if (usuario.papel !== "lideranca") {
    return NextResponse.json(
      { erro: "Apenas a liderança gerencia permissões" },
      { status: 403 },
    );
  }

  const v = await validarCorpo(req, NovaPermissao);
  if (!v.ok) return v.resposta;
  const { usuario_id, territorio_id, nivel_acesso, funcao } = v.dados;

  // Garante que o território pertence a quem está concedendo.
  const dono = await consultar(
    "SELECT id FROM territorios WHERE id = ? AND lideranca_id = ?",
    [territorio_id, usuario.id],
  );
  if (!dono.length) {
    return NextResponse.json(
      { erro: "Território não encontrado ou não é seu" },
      { status: 403 },
    );
  }

  // Upsert da permissão (a UNIQUE (usuario_id, territorio_id) garante 1 linha).
  await executar(
    `INSERT INTO coletivo_permissoes (usuario_id, territorio_id, nivel_acesso, funcao)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (usuario_id, territorio_id)
     DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso, funcao = EXCLUDED.funcao`,
    [usuario_id, territorio_id, nivel_acesso ?? "editor", funcao ?? null],
  );

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/permissoes?usuario_id=2&territorio_id=3 — revoga acesso.
 */
export async function DELETE(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || usuario.papel !== "lideranca") {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }
  const url = new URL(req.url);
  const usuarioId = url.searchParams.get("usuario_id");
  const territorioId = url.searchParams.get("territorio_id");
  if (!usuarioId || !territorioId) {
    return NextResponse.json(
      { erro: "Informe usuario_id e territorio_id" },
      { status: 400 },
    );
  }

  await executar(
    `DELETE FROM coletivo_permissoes cp
       USING territorios t
      WHERE t.id = cp.territorio_id
        AND cp.usuario_id = ? AND cp.territorio_id = ? AND t.lideranca_id = ?`,
    [usuarioId, territorioId, usuario.id],
  );
  return NextResponse.json({ ok: true });
}
