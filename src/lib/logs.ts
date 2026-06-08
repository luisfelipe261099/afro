import { executar } from "./db";

/**
 * Registra um acesso/visualização para auditoria.
 * Falha em silêncio (log nunca pode quebrar a navegação do usuário).
 */
export async function registrarAcesso(
  usuarioId: string | number,
  acao: string,
  territorioId?: string | number | null,
  detalhe?: string | null,
): Promise<void> {
  try {
    await executar(
      `INSERT INTO acesso_logs (usuario_id, acao, territorio_id, detalhe)
       VALUES (?, ?, ?, ?)`,
      [usuarioId, acao, territorioId ?? null, detalhe ?? null],
    );
  } catch {
    /* auditoria é best-effort */
  }
}
