import { NextResponse } from "next/server";
import { z } from "zod";
import { executar } from "@/lib/db";
import { usuarioAtual, podeEditar } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const Bloqueio = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  motivo: z.string().max(200).optional(),
});

/** POST /api/territorios/:id/bloqueios — bloqueia uma data (editor/liderança). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  if (!podeEditar(usuario, id)) {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }

  const v = await validarCorpo(req, Bloqueio);
  if (!v.ok) return v.resposta;

  await executar(
    `INSERT INTO bloqueios_agenda (territorio_id, data, motivo, criado_por)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (territorio_id, data) DO UPDATE SET motivo = EXCLUDED.motivo`,
    [id, v.dados.data, v.dados.motivo ?? null, usuario.id],
  );
  return NextResponse.json({ ok: true });
}

/** DELETE /api/territorios/:id/bloqueios?data=YYYY-MM-DD — desbloqueia. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  if (!podeEditar(usuario, id)) {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }
  const data = new URL(req.url).searchParams.get("data");
  if (!data) {
    return NextResponse.json({ erro: "Informe ?data=YYYY-MM-DD" }, { status: 400 });
  }

  await executar(
    `DELETE FROM bloqueios_agenda WHERE territorio_id = ? AND data = ?`,
    [id, data],
  );
  return NextResponse.json({ ok: true });
}
