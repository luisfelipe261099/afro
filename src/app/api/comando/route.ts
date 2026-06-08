import { NextResponse } from "next/server";
import { z } from "zod";
import { usuarioAtual } from "@/lib/permissions";
import { processarComando } from "@/lib/ai/processar-comando";
import { validarCorpo } from "@/lib/validacao";

// O driver do Neon, jose e bcrypt rodam no runtime Node.
export const runtime = "nodejs";

const Comando = z.object({
  texto: z.string().trim().min(1, "comando vazio").max(2000),
});

/**
 * POST /api/comando
 * Body: { texto: string }
 * A Central de Comando IA interpreta o texto e executa ações (eventos, tarefas,
 * avisos) já escopadas aos territórios do operador logado.
 */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const v = await validarCorpo(req, Comando);
  if (!v.ok) return v.resposta;

  try {
    const resultado = await processarComando(usuario, v.dados.texto);
    return NextResponse.json(resultado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar comando";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
