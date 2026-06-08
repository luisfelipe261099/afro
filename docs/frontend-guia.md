# Guia de Front-end — Estética Afro-Periférica

Diretrizes + prompts prontos para gerar a UI com **Tailwind + shadcn/ui** (use no
v0.dev, no Claude, ou direto no `npx shadcn add`). Os tokens de cor já vivem em
`tailwind.config.ts` e `src/app/globals.css` — qualquer componente shadcn herda a
paleta automaticamente.

## 1. Direção de arte (não negociável)

- **Dark mode é o padrão.** Fundo café/carvão profundo (`#1C1410`), não preto puro.
- **Cores de marca:** terracota (`#C2410C`) como ação primária, dourado (`#D4A017`)
  como destaque/realce, ocre/barro (`#B45309`/`#9A3412`) em superfícies, verde-axé
  (`folha`) como acento de "vivo/confirmado". Texto: creme quente (`#F5EDE3`).
- **Tipografia:** display **serif** com personalidade (Fraunces) para títulos;
  sans geométrica (Plus Jakarta Sans) no corpo. Fuja de Inter/Roboto/Arial.
- **Textura e calor:** gradientes de terra (`bg-gradiente-terra`), cantos
  arredondados generosos (`--radius: 0.75rem`), sombras quentes e profundas.
- **Linguagem visual:** evite "dashboard de fintech". Pense em editorial de cultura
  preta, lambe-lambe, fanzine de quebrada — mas profissional e legível.
- **Acessibilidade:** contraste AA mínimo do creme sobre o café; estados de foco
  visíveis com `ring` dourado.

## 2. Setup do shadcn/ui

```bash
npx shadcn@latest init      # escolha: estilo "new-york", cor base "neutral",
                            # CSS variables = sim (já temos globals.css pronto)
npx shadcn@latest add button card dialog input badge avatar tabs \
  dropdown-menu sonner calendar popover select
```

Os tokens semânticos (`primary`, `secondary`, `accent`, `card`…) já apontam pras
variáveis do tema — não sobrescreva cores nos componentes, use as classes
semânticas (`bg-primary`, `text-secondary`, `border-border`).

## 3. Prompts exatos de componentes

Cole cada bloco no v0/Claude. Eles assumem os tokens deste projeto.

### 3.1 Seletor de Território (sidebar)
> Crie um componente React `SeletorTerritorio` com Tailwind + shadcn/ui para uma
> sidebar dark (fundo café `#1C1410`). Liste "Territórios" como cards verticais
> clicáveis; cada card mostra um ícone em círculo com a cor do território
> (`territorio.cor`), o nome em fonte serif (`font-display`) e a descrição em
> `text-muted-foreground`. O território ativo ganha borda terracota
> (`border-primary`) e um leve `bg-primary/10`. Topo da sidebar: logo + avatar do
> usuário. Use a paleta terra/terracota/dourado. Dados: `{ id, nome, descricao,
> cor, icone }[]`.

### 3.2 Central de Comando (barra IA)
> Crie `CentralComando`: uma barra de comando flutuante e proeminente, dark,
> com cantos bem arredondados (`rounded-2xl`), `backdrop-blur` e sombra profunda.
> À esquerda um ícone `Sparkles` dourado; um input largo com placeholder em gíria
> ("Fala aí… agenda uma colagem na ocupação sábado de manhã"); à direita um botão
> de microfone (estado "ouvindo" pulsa em terracota) e um botão de enviar com
> `bg-gradiente-ouro`. Abaixo, renderize a resposta da IA (`resumo` em serif +
> lista de `acoes` com bullets dourados). Já existe uma implementação de
> referência em `src/components/central-comando.tsx`.

### 3.3 Card de Evento (agenda)
> Crie `CardEvento` (shadcn `Card`, dark): faixa lateral colorida com a cor do
> território, título em `font-display`, data/hora formatada em pt-BR, local com
> ícone `MapPin`, e um `Badge` de status (`agendado`=ocre, `confirmado`=verde-axé,
> `realizado`=muted, `cancelado`=destructive). Hover eleva o card com sombra quente.

### 3.4 Tabela/Kanban de Tarefas
> Crie `QuadroTarefas` em colunas Kanban (Aberta / Em andamento / Concluída),
> dark, com cards mostrando título, prazo, `Badge` de prioridade
> (alta=terracota, média=dourado, baixa=muted) e avatares dos responsáveis
> empilhados. Cabeçalho de cada coluna com contagem.

### 3.5 Gestão de Coletivo & Permissões
> Crie `GestaoColetivo`: tabela shadcn dark dos membros (avatar, nome, e-mail,
> papel). Ao clicar em um membro, abra um `Dialog` com uma matriz de territórios
> (checkbox por território) + select de nível (`admin`/`editor`/`leitor`) + input
> de função (comunicacao/cultura/juridico…). Botão "Salvar acesso" em terracota
> que faz `POST /api/permissoes`.

## 4. Microcopy

Use a voz da base, sem infantilizar: "Marcado!", "Coletivo acionado",
"Tá na agenda", "Sem acesso a esse território". Confirmações curtas e diretas.

## 5. Endpoints que o front consome

| Tela | Chamada |
|---|---|
| Login | `POST /api/auth/login` |
| Sidebar de territórios | `GET /api/territorios` |
| Agenda | `GET /api/eventos?territorio_id=` · `POST /api/eventos` |
| Tarefas | `GET /api/tarefas?territorio_id=` · `POST /api/tarefas` |
| Coletivo | `GET /api/coletivo[?territorio_id=]` · `POST /api/coletivo` |
| Permissões | `POST /api/permissoes` · `DELETE /api/permissoes` |
| Central de Comando | `POST /api/comando` `{ texto }` → `{ resumo, acoes }` |
