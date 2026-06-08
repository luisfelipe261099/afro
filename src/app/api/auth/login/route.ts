import { NextResponse } from "next/server";
import { consultarUm } from "@/lib/db";
import { conferirSenha, criarSessao } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { email, senha }
 */
export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe email e senha" }, { status: 400 });
  }

  const u = await consultarUm<{ id: string; nome: string; senha_hash: string }>(
    "SELECT id, nome, senha_hash FROM usuarios WHERE email = ? AND ativo = TRUE",
    [email],
  );
  if (!u || !(await conferirSenha(senha, u.senha_hash))) {
    return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
  }

  await criarSessao(u.id);
  return NextResponse.json({ ok: true, usuario: { id: u.id, nome: u.nome } });
}
