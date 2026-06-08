import { NextResponse } from "next/server";
import { consultarUm, executar } from "@/lib/db";
import { usuarioAtual, podeAcessar } from "@/lib/permissions";

export const runtime = "nodejs";

/** GET /api/territorios/:id — detalhe de um território. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  if (!podeAcessar(usuario, id)) {
    return NextResponse.json({ erro: "Sem acesso" }, { status: 403 });
  }

  const territorio = await consultarUm(
    "SELECT id, nome, descricao, cor, icone, lideranca_id FROM territorios WHERE id = ?",
    [id],
  );
  return NextResponse.json({ territorio });
}

/** PATCH /api/territorios/:id — edição (só a liderança dona). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario || usuario.papel !== "lideranca") {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const dono = await consultarUm(
    "SELECT id FROM territorios WHERE id = ? AND lideranca_id = ?",
    [id, usuario.id],
  );
  if (!dono) {
    return NextResponse.json({ erro: "Território não é seu" }, { status: 403 });
  }

  const { nome, descricao, cor, icone, arquivado } = await req.json().catch(() => ({}));
  await executar(
    `UPDATE territorios
        SET nome = COALESCE(?, nome),
            descricao = COALESCE(?, descricao),
            cor = COALESCE(?, cor),
            icone = COALESCE(?, icone),
            arquivado = COALESCE(?, arquivado)
      WHERE id = ?`,
    [nome ?? null, descricao ?? null, cor ?? null, icone ?? null, arquivado ?? null, id],
  );
  return NextResponse.json({ ok: true });
}
