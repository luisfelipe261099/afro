import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { SISTEMA } from "./system-prompt";
import { construirFerramentas, type AcaoRealizada } from "./tools";
import { consultar, executar } from "../db";
import type { UsuarioSessao } from "../permissions";

/**
 * Modelo da Central de Comando — Google Gemini.
 * Padrão: gemini-2.0-flash (rápido, barato, com camada gratuita e function calling).
 * Alternativas: 'gemini-2.5-flash' (mais novo) ou 'gemini-1.5-pro' (mais capaz).
 * A chave vai em GOOGLE_GENERATIVE_AI_API_KEY no .env.local.
 *
 * Pra voltar pro Claude: troque para `import { anthropic } from "@ai-sdk/anthropic"`,
 * use anthropic("claude-opus-4-8") abaixo e defina ANTHROPIC_API_KEY.
 */
export const MODELO_IA = "gemini-2.0-flash";

export type ResultadoComando = {
  resumo: string;
  acoes: AcaoRealizada[];
};

export async function processarComando(
  usuario: UsuarioSessao,
  texto: string,
): Promise<ResultadoComando> {
  const acoes: AcaoRealizada[] = [];
  const contexto = await montarContexto(usuario);
  const ferramentas = construirFerramentas(usuario, acoes);

  const r = await generateText({
    model: google(MODELO_IA),
    system: SISTEMA,
    prompt: `${contexto}\n\nComando do operador:\n"""${texto}"""`,
    tools: ferramentas,
    // Permite a IA encadear leituras + várias escritas numa só passada.
    stopWhen: stepCountIs(6),
  });

  // Auditoria: guarda o comando bruto e o que de fato foi executado.
  await executar(
    `INSERT INTO comando_logs (usuario_id, texto, acoes_json, modelo)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [usuario.id, texto, JSON.stringify(acoes), MODELO_IA],
  );

  return { resumo: r.text, acoes };
}

/**
 * Monta o contexto dinâmico injetado no prompt: data/hora atual e a lista de
 * territórios + coletivo que ESTE operador pode acessar. A IA só recebe (e só
 * consegue escrever) dentro desse recorte — o escopo de permissão é aplicado
 * tanto aqui (o modelo só vê o permitido) quanto nas ferramentas (validação dura).
 */
async function montarContexto(usuario: UsuarioSessao): Promise<string> {
  const dataAtual = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const linhas: string[] = [];
  for (const t of usuario.territorios) {
    const membros = await consultar<{
      id: string;
      nome: string;
      funcao: string | null;
    }>(
      `SELECT u.id, u.nome, cp.funcao
         FROM coletivo_permissoes cp
         JOIN usuarios u ON u.id = cp.usuario_id
        WHERE cp.territorio_id = ?`,
      [t.id],
    );
    const coletivo =
      membros
        .map((m) => `${m.nome} (#${m.id}${m.funcao ? `, ${m.funcao}` : ""})`)
        .join("; ") || "sem membros cadastrados";
    linhas.push(
      `- Território #${t.id} "${t.nome}"${t.descricao ? ` — ${t.descricao}` : ""}. Coletivo: ${coletivo}.`,
    );
  }

  return [
    `Data e hora atuais (America/Sao_Paulo): ${dataAtual}.`,
    "",
    "Territórios que ESTE operador pode acessar (use apenas estes IDs):",
    linhas.join("\n"),
  ].join("\n");
}
