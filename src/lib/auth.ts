import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE = "afro_sessao";
const segredo = () => new TextEncoder().encode(process.env.JWT_SECRET!);

/** Gera o hash de uma senha (use no cadastro e no script de seed). */
export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

/** Confere senha contra o hash salvo. */
export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/** Cria a sessão (JWT em cookie httpOnly) após login bem-sucedido. */
export async function criarSessao(usuarioId: string | number): Promise<void> {
  const token = await new SignJWT({ sub: String(usuarioId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(segredo());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Derruba a sessão. */
export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Lê o id do usuário logado a partir do cookie, ou null. */
export async function lerSessao(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return Number(payload.sub);
  } catch {
    return null;
  }
}
