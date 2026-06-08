import { tool } from "ai";
import { z } from "zod";
import { consultar, executar, inserir } from "../db";
import type { UsuarioSessao } from "../permissions";

export type AcaoRealizada = {
  tipo: "evento" | "tarefa" | "aviso";
  descricao: string;
  dados: Record<string, unknown>;
};

/** ISO ('2026-06-13T09:00:00', com ou sem Z/offset) → 'YYYY-MM-DD HH:MM:SS'. */
function paraDatetime(iso: string): string {
  return iso
    .replace("T", " ")
    .replace(/\.\d+/, "")
    .replace(/(Z|[+-]\d{2}:?\d{2})$/, "")
    .trim()
    .slice(0, 19);
}

/**
 * Fábrica de ferramentas da IA, "fechada" sobre o usuário logado.
 *
 * Segurança: TODA ferramenta valida o território contra `idsPermitidos` antes
 * de escrever. Mesmo que o modelo alucine um ID, a escrita é barrada. As ações
 * executadas são empilhadas em `acoes` para a rota devolver ao front exatamente
 * o que foi criado (com os IDs reais).
 */
export function construirFerramentas(
  usuario: UsuarioSessao,
  acoes: AcaoRealizada[],
) {
  const idsPermitidos = new Set(usuario.territorios.map((t) => String(t.id)));

  function exigirTerritorio(id: number) {
    if (!idsPermitidos.has(String(id))) {
      throw new Error(
        `Operador sem acesso ao território #${id}. Territórios permitidos: ${[...idsPermitidos].join(", ")}`,
      );
    }
  }

  return {
    criar_evento: tool({
      description:
        "Cria um evento/compromisso na agenda de um território (reunião, colagem, ato, corre, visita, plenária).",
      inputSchema: z.object({
        territorio_id: z
          .number()
          .describe("ID do território onde o evento acontece (use os do contexto)"),
        titulo: z.string().describe("Título curto do evento"),
        descricao: z.string().optional(),
        local: z.string().optional().describe("Local do evento, se mencionado"),
        inicio: z
          .string()
          .describe("Início em ISO 8601 local, ex: 2026-06-13T09:00:00"),
        fim: z.string().optional().describe("Fim em ISO 8601 local, se houver"),
        responsavel_id: z
          .number()
          .optional()
          .describe("ID do responsável pelo evento (ex.: o professor da aula), se indicado"),
      }),
      execute: async ({ territorio_id, titulo, descricao, local, inicio, fim, responsavel_id }) => {
        exigirTerritorio(territorio_id);
        const id = await inserir(
          `INSERT INTO eventos (territorio_id, titulo, descricao, local, inicio, fim, responsavel_id, criado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          [
            territorio_id,
            titulo,
            descricao ?? null,
            local ?? null,
            paraDatetime(inicio),
            fim ? paraDatetime(fim) : null,
            responsavel_id ?? null,
            usuario.id,
          ],
        );
        if (responsavel_id) {
          await executar(
            `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
             VALUES (?, ?, ?, ?, 'evento', ?)`,
            [responsavel_id, territorio_id, `Novo compromisso: ${titulo}`, local ?? null, id],
          );
        }
        acoes.push({
          tipo: "evento",
          descricao: `Evento "${titulo}" agendado`,
          dados: { id, territorio_id, inicio, local, responsavel_id },
        });
        return { ok: true, evento_id: id };
      },
    }),

    criar_tarefa: tool({
      description:
        "Cria uma tarefa/encaminhamento num território e (opcionalmente) atribui a membros do coletivo.",
      inputSchema: z.object({
        territorio_id: z.number(),
        titulo: z.string(),
        descricao: z.string().optional(),
        prazo: z.string().optional().describe("Prazo em ISO 8601 local, se houver"),
        prioridade: z.enum(["baixa", "media", "alta"]).optional(),
        responsaveis: z
          .array(z.number())
          .optional()
          .describe("IDs dos membros responsáveis (use os do contexto)"),
      }),
      execute: async ({
        territorio_id,
        titulo,
        descricao,
        prazo,
        prioridade,
        responsaveis,
      }) => {
        exigirTerritorio(territorio_id);
        const tarefaId = await inserir(
          `INSERT INTO tarefas (territorio_id, titulo, descricao, prazo, prioridade, criado_por)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
          [
            territorio_id,
            titulo,
            descricao ?? null,
            prazo ? paraDatetime(prazo) : null,
            prioridade ?? "media",
            usuario.id,
          ],
        );

        for (const uid of responsaveis ?? []) {
          await executar(
            `INSERT INTO tarefa_responsaveis (tarefa_id, usuario_id) VALUES (?, ?)
             ON CONFLICT (tarefa_id, usuario_id) DO NOTHING`,
            [tarefaId, uid],
          );
          await executar(
            `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
             VALUES (?, ?, ?, ?, 'tarefa', ?)`,
            [uid, territorio_id, `Nova tarefa: ${titulo}`, descricao ?? null, tarefaId],
          );
        }

        acoes.push({
          tipo: "tarefa",
          descricao: `Tarefa "${titulo}" criada`,
          dados: { id: tarefaId, territorio_id, responsaveis: responsaveis ?? [] },
        });
        return { ok: true, tarefa_id: tarefaId, atribuida_a: responsaveis ?? [] };
      },
    }),

    avisar_coletivo: tool({
      description:
        "Aciona/avisa um grupo do coletivo de um território, pela função (ex.: 'comunicacao', 'cultura', 'juridico', 'mobilizacao'). Cria notificações para todos os membros daquela função.",
      inputSchema: z.object({
        territorio_id: z.number(),
        funcao: z
          .string()
          .describe("Função do grupo a avisar, ex.: comunicacao, cultura, juridico"),
        mensagem: z.string().describe("O recado a ser enviado ao grupo"),
      }),
      execute: async ({ territorio_id, funcao, mensagem }) => {
        exigirTerritorio(territorio_id);
        const membros = await consultar<{ id: string; nome: string }>(
          `SELECT u.id, u.nome
             FROM coletivo_permissoes cp
             JOIN usuarios u ON u.id = cp.usuario_id
            WHERE cp.territorio_id = ? AND cp.funcao = ?`,
          [territorio_id, funcao],
        );

        for (const m of membros) {
          await executar(
            `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo)
             VALUES (?, ?, ?, ?, 'aviso')`,
            [m.id, territorio_id, `Aviso para ${funcao}`, mensagem],
          );
        }

        acoes.push({
          tipo: "aviso",
          descricao: `Coletivo de ${funcao} avisado (${membros.length} pessoa(s))`,
          dados: {
            territorio_id,
            funcao,
            avisados: membros.map((m) => m.nome),
          },
        });
        return {
          ok: true,
          avisados: membros.map((m) => m.nome),
          total: membros.length,
        };
      },
    }),
  };
}
