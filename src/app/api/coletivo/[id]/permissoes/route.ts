import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";

export const runtime = "nodejs";

/**
 * GET /api/coletivo/:id/permissoes
 * Matriz de acesso de um membro: todos os territórios da liderança logada,
 * marcando onde o membro já tem acesso (nível + função). Só a liderança.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario || usuario.papel !== "lideranca") {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;

  const permissoes = await consultar(
    `SELECT t.id AS territorio_id, t.nome, t.cor,
            cp.nivel_acesso, cp.funcao,
            (cp.id IS NOT NULL) AS tem_acesso
       FROM territorios t
       LEFT JOIN coletivo_permissoes cp
              ON cp.territorio_id = t.id AND cp.usuario_id = ?
      WHERE t.lideranca_id = ? AND t.arquivado = FALSE
      ORDER BY t.nome`,
    [id, usuario.id],
  );
  return NextResponse.json({ permissoes });
}
