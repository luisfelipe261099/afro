-- ============================================================================
--  Seed de exemplo (PostgreSQL/Neon) — substitua os hashes de senha!
--  Gere um hash com:  npm run hash -- "minhaSenha123"
--  Recomendado: use `npm run db:seed` (scripts/seed.mjs), que já gera o hash.
-- ============================================================================

-- Liderança
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES
  ('Dandara (Liderança)', 'lideranca@afro.org', '$2a$10$SUBSTITUA_PELO_HASH', 'lideranca');

-- Assessores / coletivo
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES
  ('Marielle (Comunicação)', 'comunica@afro.org', '$2a$10$SUBSTITUA_PELO_HASH', 'assessor'),
  ('Beatriz (Cultura)',      'cultura@afro.org',  '$2a$10$SUBSTITUA_PELO_HASH', 'assessor');

-- Territórios (todos da liderança, id=1)
INSERT INTO territorios (nome, descricao, cor, icone, lideranca_id) VALUES
  ('Mandato / Governo',      'Agenda institucional e articulação política', '#B45309', 'predio',     1),
  ('Movimento Negro / Afro', 'Articulação do movimento negro',              '#C2410C', 'punho',      1),
  ('Base / Quebrada',        'Projetos de base e cultura periférica',       '#A16207', 'comunidade', 1);

-- Permissões: cada assessor enxerga só o seu território
INSERT INTO coletivo_permissoes (usuario_id, territorio_id, nivel_acesso, funcao) VALUES
  (2, 2, 'editor', 'comunicacao'),
  (2, 3, 'editor', 'comunicacao'),
  (3, 3, 'editor', 'cultura');
