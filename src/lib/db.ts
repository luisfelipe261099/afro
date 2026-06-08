import { neon } from "@neondatabase/serverless";

/**
 * Conexão HTTP com o Neon (PostgreSQL serverless).
 *
 * O driver `@neondatabase/serverless` fala HTTP (fetch), então cada invocação
 * de função na Vercel é stateless e não segura conexão TCP — ideal pra evitar
 * estourar o limite de conexões do plano gratuito.
 *
 * Os helpers abaixo aceitam placeholders no estilo MySQL ("?") e convertem para
 * o estilo Postgres ("$1, $2, ...") em `paraPg`. Assim as rotas continuam
 * escrevendo "?" e ficam agnósticas ao banco. Para INSERTs que precisam do id,
 * use `inserir` com "... RETURNING id".
 */
const sql = neon(process.env.DATABASE_URL!);

/** Converte "?" -> "$1, $2, ..." (queries já em "$n" passam intactas). */
function paraPg(texto: string): string {
  let i = 0;
  return texto.replace(/\?/g, () => `$${++i}`);
}

/** SELECT — devolve as linhas tipadas. */
export async function consultar<T = Record<string, unknown>>(
  texto: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await sql(paraPg(texto), params as never[]);
  return rows as T[];
}

/** SELECT de uma linha só (ou null). */
export async function consultarUm<T = Record<string, unknown>>(
  texto: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await consultar<T>(texto, params);
  return rows[0] ?? null;
}

/** INSERT/UPDATE/DELETE sem necessidade de id. */
export async function executar(
  texto: string,
  params: unknown[] = [],
): Promise<{ rowsAffected: number }> {
  const rows = await sql(paraPg(texto), params as never[]);
  return { rowsAffected: Array.isArray(rows) ? rows.length : 0 };
}

/**
 * INSERT que devolve o id gerado.
 * O SQL DEVE terminar com "RETURNING id". Retorna o id como string.
 */
export async function inserir(
  texto: string,
  params: unknown[] = [],
): Promise<string | null> {
  const rows = (await sql(paraPg(texto), params as never[])) as {
    id: string;
  }[];
  return rows[0]?.id ?? null;
}

export const db = sql;
