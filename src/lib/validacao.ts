import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Lê e valida o corpo JSON de uma request contra um schema Zod.
 * Retorna { ok, dados } ou { ok:false, resposta } com 400 já formatado.
 *
 * Uso:
 *   const v = await validarCorpo(req, Schema);
 *   if (!v.ok) return v.resposta;
 *   const { ... } = v.dados;
 */
export async function validarCorpo<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; dados: T } | { ok: false; resposta: Response }> {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }

  const r = schema.safeParse(corpo);
  if (!r.success) {
    const detalhes = r.error.issues
      .map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: "Dados inválidos", detalhes },
        { status: 400 },
      ),
    };
  }
  return { ok: true, dados: r.data };
}
