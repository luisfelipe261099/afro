import { NextResponse } from "next/server";
import { z } from "zod";
import { inserir } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { validarCorpo } from "@/lib/validacao";

export const runtime = "nodejs";

const NovoTerritorio = z.object({
  nome: z.string().trim().min(1).max(160),
  descricao: z.string().max(2000).optional(),
  cor: z.string().max(9).optional(),
  icone: z.string().max(40).optional(),
});

/** GET /api/territorios — territórios visíveis ao operador logado. */
export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json({ territorios: usuario.territorios });
}

/** POST /api/territorios — só a liderança cria territórios. */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  if (usuario.papel !== "lideranca") {
    return NextResponse.json(
      { erro: "Apenas a liderança pode criar territórios" },
      { status: 403 },
    );
  }

  const v = await validarCorpo(req, NovoTerritorio);
  if (!v.ok) return v.resposta;
  const { nome, descricao, cor, icone } = v.dados;

  const id = await inserir(
    `INSERT INTO territorios (nome, descricao, cor, icone, lideranca_id)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [nome, descricao ?? null, cor ?? "#C2410C", icone ?? "territorio", usuario.id],
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
