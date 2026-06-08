import { consultar } from "./db";
import { lerSessao } from "./auth";

export type TerritorioPermitido = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  nivel_acesso: "admin" | "editor" | "leitor";
  funcao: string | null;
};

export type UsuarioSessao = {
  id: string;
  nome: string;
  email: string;
  papel: "lideranca" | "assessor";
  territorios: TerritorioPermitido[];
};

/**
 * Carrega o usuário + os territórios a que ele tem acesso.
 *
 * Regra de visibilidade:
 *  - a liderança enxerga todos os territórios que possui (nível 'admin');
 *  - o assessor enxerga apenas os territórios em que tem permissão explícita
 *    em `coletivo_permissoes`.
 * Esse único SELECT é a espinha dorsal do controle de acesso: tudo o que vier
 * depois (rotas e IA) só opera sobre os IDs que aparecem aqui.
 */
export async function carregarUsuario(
  usuarioId: number,
): Promise<UsuarioSessao | null> {
  const u = await consultar<{
    id: string;
    nome: string;
    email: string;
    papel: "lideranca" | "assessor";
  }>(
    "SELECT id, nome, email, papel FROM usuarios WHERE id = ? AND ativo = TRUE",
    [usuarioId],
  );
  if (!u.length) return null;

  const territorios = await consultar<TerritorioPermitido>(
    `SELECT t.id, t.nome, t.descricao, t.cor, t.icone,
            COALESCE(cp.nivel_acesso, 'admin') AS nivel_acesso,
            cp.funcao
       FROM territorios t
       LEFT JOIN coletivo_permissoes cp
              ON cp.territorio_id = t.id AND cp.usuario_id = ?
      WHERE t.arquivado = FALSE
        AND (t.lideranca_id = ? OR cp.id IS NOT NULL)
      ORDER BY t.nome`,
    [usuarioId, usuarioId],
  );

  return { ...u[0], territorios };
}

/** Usuário logado completo (ou null se não autenticado). */
export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const id = await lerSessao();
  if (!id) return null;
  return carregarUsuario(id);
}

export function podeAcessar(u: UsuarioSessao, territorioId: string | number) {
  return u.territorios.some((t) => String(t.id) === String(territorioId));
}

export function podeEditar(u: UsuarioSessao, territorioId: string | number) {
  return u.territorios.some(
    (t) => String(t.id) === String(territorioId) && t.nivel_acesso !== "leitor",
  );
}
