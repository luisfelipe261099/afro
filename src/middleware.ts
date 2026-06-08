import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Porteiro de borda (Edge Middleware).
 *
 * Verifica o JWT da sessão ANTES de chegar nas rotas protegidas — primeira
 * camada de defesa. As rotas continuam revalidando com `usuarioAtual()`
 * (defesa em profundidade) e aplicando as regras de permissão por território.
 *
 * Importa só `jose` (compatível com o runtime Edge) — nada de bcrypt/DB aqui.
 */
const segredo = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("afro_sessao")?.value;
  let autenticado = false;
  if (token) {
    try {
      await jwtVerify(token, segredo());
      autenticado = true;
    } catch {
      autenticado = false;
    }
  }

  if (autenticado) return NextResponse.next();

  const ehApi = req.nextUrl.pathname.startsWith("/api");
  if (ehApi) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  return NextResponse.redirect(login);
}

// Protege o app e as APIs — exceto /api/auth/* (login precisa ser público).
export const config = {
  matcher: [
    "/app/:path*",
    "/api/comando",
    "/api/territorios/:path*",
    "/api/eventos/:path*",
    "/api/tarefas/:path*",
    "/api/coletivo/:path*",
    "/api/permissoes/:path*",
    "/api/notificacoes/:path*",
  ],
};
