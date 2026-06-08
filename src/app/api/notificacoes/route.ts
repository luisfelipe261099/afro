import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";

export const runtime = "nodejs";

/**
 * GET /api/notificacoes[?nao_lidas=1]
 * Notificações do usuário logado (mais recentes primeiro).
 */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const soNaoLidas = new URL(req.url).searchParams.get("nao_lidas") === "1";

  const notificacoes = await consultar(
    `SELECT id, titulo, mensagem, tipo, territorio_id, referencia_id, lida, criado_em
       FROM notificacoes
      WHERE usuario_id = ?
        AND (?::boolean IS NOT TRUE OR lida = FALSE)
      ORDER BY criado_em DESC
      LIMIT 50`,
    [usuario.id, soNaoLidas],
  );
  return NextResponse.json({ notificacoes });
}
