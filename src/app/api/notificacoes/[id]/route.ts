import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";

export const runtime = "nodejs";

/** PATCH /api/notificacoes/:id — marca como lida (só a própria notificação). */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  await executar(
    `UPDATE notificacoes SET lida = TRUE WHERE id = ? AND usuario_id = ?`,
    [id, usuario.id],
  );
  return NextResponse.json({ ok: true });
}
