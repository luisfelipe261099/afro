-- ============================================================================
--  Plataforma Afro — Territórios, Agendas e Coletivo
--  Banco: Neon (PostgreSQL serverless)
--  Identidade: vocabulário do movimento negro/periférico (pt-BR)
-- ----------------------------------------------------------------------------
--  Notas:
--   * IDs com IDENTITY (padrão moderno do Postgres); o driver devolve BIGINT
--     como string — mantenha os IDs como string ao serializar em JSON.
--   * ENUMs do MySQL viraram TEXT + CHECK (mais simples de evoluir, sem CREATE TYPE).
--   * `atualizado_em` tem DEFAULT now() mas NÃO auto-atualiza no UPDATE
--     (Postgres não tem ON UPDATE). Para tocar a coluna a cada update, crie
--     um trigger depois; para o MVP, setamos manualmente quando necessário.
-- ============================================================================

-- ── USUÁRIOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome          VARCHAR(160) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255) NOT NULL,
  papel         TEXT NOT NULL DEFAULT 'assessor' CHECK (papel IN ('lideranca','assessor')),
  avatar_url    VARCHAR(255),
  telefone      VARCHAR(40),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TERRITÓRIOS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS territorios (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome          VARCHAR(160) NOT NULL,
  descricao     TEXT,
  cor           VARCHAR(9)  NOT NULL DEFAULT '#C2410C',
  icone         VARCHAR(40) NOT NULL DEFAULT 'territorio',
  lideranca_id  BIGINT NOT NULL REFERENCES usuarios(id),
  arquivado     BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_territorios_lideranca ON territorios (lideranca_id);

-- ── COLETIVO / PERMISSÕES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coletivo_permissoes (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuarios(id),
  territorio_id BIGINT NOT NULL REFERENCES territorios(id),
  nivel_acesso  TEXT NOT NULL DEFAULT 'editor' CHECK (nivel_acesso IN ('admin','editor','leitor')),
  funcao        VARCHAR(60),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, territorio_id)
);
CREATE INDEX IF NOT EXISTS idx_coletivo_territorio ON coletivo_permissoes (territorio_id);

-- ── EVENTOS / AGENDA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territorio_id BIGINT NOT NULL REFERENCES territorios(id),
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT,
  local         VARCHAR(200),
  inicio        TIMESTAMP NOT NULL,
  fim           TIMESTAMP,
  status        TEXT NOT NULL DEFAULT 'agendado'
                CHECK (status IN ('agendado','confirmado','realizado','cancelado')),
  criado_por    BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_territorio_inicio ON eventos (territorio_id, inicio);

-- ── TAREFAS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefas (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territorio_id BIGINT NOT NULL REFERENCES territorios(id),
  evento_id     BIGINT REFERENCES eventos(id),
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT,
  prazo         TIMESTAMP,
  prioridade    TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  status        TEXT NOT NULL DEFAULT 'aberta'
                CHECK (status IN ('aberta','em_andamento','concluida','cancelada')),
  criado_por    BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarefas_territorio ON tarefas (territorio_id, status);

-- ── RESPONSÁVEIS POR TAREFA (N:N) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefa_responsaveis (
  tarefa_id   BIGINT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tarefa_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_tr_usuario ON tarefa_responsaveis (usuario_id);

-- ── NOTIFICAÇÕES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuarios(id),
  territorio_id BIGINT,
  titulo        VARCHAR(200) NOT NULL,
  mensagem      TEXT,
  tipo          TEXT NOT NULL DEFAULT 'aviso' CHECK (tipo IN ('evento','tarefa','aviso')),
  referencia_id BIGINT,
  lida          BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificacoes (usuario_id, lida);

-- ── AUDITORIA DA CENTRAL DE COMANDO IA ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS comando_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuarios(id),
  texto         TEXT NOT NULL,
  acoes_json    JSONB,
  modelo        VARCHAR(60),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comando_usuario ON comando_logs (usuario_id, criado_em);

-- ════════════════════════════════════════════════════════════════════════════
--  FASE 1 — Responsáveis, Relatórios e Auditoria de acesso
--  (ALTER/CREATE com IF NOT EXISTS: seguro re-rodar no banco existente)
-- ════════════════════════════════════════════════════════════════════════════

-- Papel "professor" passa a ser válido em usuarios.papel
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_papel_check
  CHECK (papel IN ('lideranca','assessor','professor'));

-- Evento pode ter um RESPONSÁVEL (ex.: o professor da aula) e exigir relatório
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS responsavel_id BIGINT REFERENCES usuarios(id);
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS relatorio_status TEXT NOT NULL DEFAULT 'nao_solicitado'
  CHECK (relatorio_status IN ('nao_solicitado','pendente','entregue'));
CREATE INDEX IF NOT EXISTS idx_eventos_responsavel ON eventos (responsavel_id);

-- Relatórios de aula/compromisso (o professor presta contas pra liderança)
CREATE TABLE IF NOT EXISTS relatorios (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento_id  BIGINT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  autor_id   BIGINT NOT NULL REFERENCES usuarios(id),
  conteudo   TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relatorios_evento ON relatorios (evento_id);

-- Auditoria: quem acessou/viu o quê (território, agenda, minha agenda)
CREATE TABLE IF NOT EXISTS acesso_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuarios(id),
  acao          VARCHAR(60) NOT NULL,
  territorio_id BIGINT,
  detalhe       VARCHAR(200),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acesso_usuario ON acesso_logs (usuario_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_acesso_territorio ON acesso_logs (territorio_id, criado_em);

-- ════════════════════════════════════════════════════════════════════════════
--  FASE 2 — Entregas nas tarefas (links/textos) + Biblioteca
-- ════════════════════════════════════════════════════════════════════════════

-- Entregas: o responsável por uma tarefa anexa link(s) ou texto(s).
-- (Ex.: "Capítulo 3 do livro" → link do Google Docs + nota.)
CREATE TABLE IF NOT EXISTS entregas (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tarefa_id  BIGINT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  autor_id   BIGINT NOT NULL REFERENCES usuarios(id),
  tipo       TEXT NOT NULL DEFAULT 'link' CHECK (tipo IN ('link','texto')),
  titulo     VARCHAR(200),
  conteudo   TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entregas_tarefa ON entregas (tarefa_id);

-- ════════════════════════════════════════════════════════════════════════════
--  FASE 3 — Controle de agenda: bloquear datas + lembretes
-- ════════════════════════════════════════════════════════════════════════════

-- Datas bloqueadas por território (folga, viagem, indisponível).
CREATE TABLE IF NOT EXISTS bloqueios_agenda (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territorio_id BIGINT NOT NULL REFERENCES territorios(id) ON DELETE CASCADE,
  data          DATE NOT NULL,
  motivo        VARCHAR(200),
  criado_por    BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (territorio_id, data)
);
CREATE INDEX IF NOT EXISTS idx_bloqueios_territorio ON bloqueios_agenda (territorio_id, data);

-- Flag para não mandar o lembrete do mesmo evento duas vezes.
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS lembrete_enviado BOOLEAN NOT NULL DEFAULT FALSE;
