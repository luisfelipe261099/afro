# Plataforma Afro — Territórios, Agendas & Coletivo com IA

MVP de gestão para uma liderança negra, periférica e afro. Next.js (App Router) na
Vercel + Neon (PostgreSQL serverless) + Vercel AI SDK com Claude.

## Conceitos (vocabulário da plataforma)

| Termo na plataforma | O que é |
|---|---|
| **Território** | Agenda/contexto separado (Mandato, Movimento Negro, Base/Quebrada). |
| **Coletivo** | O time de assessores/membros. |
| **Permissão** | Quem acessa qual território, com qual nível e função. |
| **Central de Comando** | Barra de IA (texto/voz) que cria eventos, tarefas e avisos. |

## Stack

- **Next.js 15** (App Router, API Routes como serverless functions)
- **Neon / PostgreSQL** via `@neondatabase/serverless` (driver HTTP — ideal pra Vercel)
- **Vercel AI SDK** (`ai`) + `@ai-sdk/anthropic` → Claude (`claude-opus-4-8` por padrão)
- **Auth**: JWT em cookie httpOnly (`jose`) + `bcryptjs` + Edge Middleware
- **Validação**: Zod em todas as rotas de escrita
- **UI**: Tailwind + componentes shadcn-style (paleta terra/terracota/dourado, dark mode)

## Estrutura

```
db/
  schema.sql            # DDL (PostgreSQL)
  seed.sql              # dados de exemplo
scripts/
  migrar.mjs            # aplica o schema no Neon
  seed.mjs              # popula exemplo (login: lideranca@afro.org / quebrada123)
  criar-hash.mjs        # gera bcrypt hash
src/
  middleware.ts         # porteiro de borda (verifica JWT antes das rotas)
  lib/
    db.ts               # Neon + helpers (consultar / consultarUm / executar / inserir)
    auth.ts             # sessão JWT + bcrypt
    permissions.ts      # carregarUsuario / usuarioAtual / podeAcessar / podeEditar
    validacao.ts        # validarCorpo (Zod)
    ai/
      system-prompt.ts  # persona + vocabulário do movimento
      tools.ts          # ferramentas da IA (criar_evento, criar_tarefa, avisar_coletivo)
      processar-comando.ts  # generateText + contexto escopado por permissão
  app/api/
    auth/login + auth/logout
    comando/route.ts        # Central de Comando IA
    territorios/route.ts        + [id]/route.ts
    eventos/route.ts · tarefas/route.ts + tarefas/[id]/route.ts
    coletivo/route.ts · coletivo/[id]/permissoes/route.ts
    permissoes/route.ts
    notificacoes/route.ts       + [id]/route.ts
  app/
    page.tsx                    # landing pública
    login/page.tsx              # tela de login
    app/layout.tsx              # shell protegido (sidebar + barra + sininho)
    app/page.tsx                # redireciona pro 1º território
    app/territorio/[id]/page.tsx  # agenda + tarefas do território
    app/coletivo/page.tsx       # gestão de coletivo + permissões (só liderança)
  components/
    central-comando.tsx         # barra de IA (texto + voz)
    sininho-notificacoes.tsx    # sino de avisos (contador + dropdown)
    gestao-coletivo.tsx         # cadastro de membro + matriz de acessos
    quadro-tarefas.tsx          # kanban (mover status: aberta→andamento→concluída)
    sidebar-territorios.tsx · botao-sair.tsx
    ui/                         # button · card · badge (shadcn-style)
```

**Deploy:** passo a passo na Vercel em [DEPLOY.md](DEPLOY.md).

> **Status:** schema + seed aplicados e validados no Neon; `next build` passa; fluxo
> login → permissões → CRUD testado em runtime. Falta só `ANTHROPIC_API_KEY` real
> para exercitar a Central de Comando ponta a ponta.

## Como rodar

```bash
npm install
cp .env.example .env.local      # preencha DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET

# aplica schema e popula exemplo (exporte as vars do .env.local antes)
export $(grep -v '^#' .env.local | xargs)
npm run db:migrate
npm run db:seed

npm run dev                     # http://localhost:3000
```

Login de teste após o seed: **lideranca@afro.org** / **quebrada123**
(faça `POST /api/auth/login` para receber o cookie de sessão).

## A Central de Comando na prática

Comando:
> "Agenda uma colagem com a liderança da ocupação pro próximo sábado de manhã e avisa o coletivo de comunicação"

Fluxo:
1. `/api/comando` carrega o usuário e **somente** os territórios que ele acessa.
2. O contexto (data atual + territórios + coletivo com funções) vai no prompt.
3. Claude resolve a data ("próximo sábado de manhã" → ISO), escolhe o território
   certo e chama `criar_evento` + `avisar_coletivo(funcao: "comunicacao")`.
4. As ferramentas **revalidam o território** contra a permissão antes de escrever.
5. Retorna `{ resumo, acoes }` — o que foi feito, com IDs reais. Tudo logado em `comando_logs`.

### Escopo de permissão (defesa em profundidade)

- O modelo só **vê** os territórios do operador (injetados no contexto).
- As ferramentas **rejeitam** qualquer `territorio_id` fora de `coletivo_permissoes`.

Um assessor de cultura da Base nunca cria nada no Mandato, mesmo que peça.

## Front-end

A estética e os prompts prontos de componentes shadcn/ui estão em
[`docs/frontend-guia.md`](docs/frontend-guia.md). Os tokens de cor já estão em
`tailwind.config.ts` + `src/app/globals.css`, e `src/components/central-comando.tsx`
é um exemplo funcional (texto + voz via Web Speech API).
