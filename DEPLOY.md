# Deploy na Vercel

O app já está pronto pra Vercel (Next.js App Router + Neon serverless + Edge Middleware).
O banco (schema + seed) já foi aplicado no seu Neon. Falta só subir o código e
configurar as variáveis de ambiente.

## 1. Versionar o código

O projeto ainda não é um repositório git. Inicialize e suba pro GitHub:

```bash
git init
git add .
git commit -m "MVP: territórios, agenda, coletivo e Central de Comando IA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/plataforma-afro.git
git push -u origin main
```

> O `.gitignore` já exclui `.env.local` e `node_modules` — seus segredos não vão pro git.

## 2. Importar na Vercel

1. Acesse https://vercel.com/new e importe o repositório.
2. Framework: **Next.js** (detectado automaticamente). Não precisa mudar build/output.
3. **Region:** escolha `Washington, D.C. (iad1)` — é o mesmo `us-east-1` do seu Neon,
   o que reduz a latência entre função e banco.

## 3. Variáveis de ambiente (Project → Settings → Environment Variables)

Adicione as três, para **Production** (e Preview/Development se quiser):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon (a mesma do `.env.local`) |
| `ANTHROPIC_API_KEY` | sua chave da Anthropic (`sk-ant-...`) — necessária pra Central de Comando |
| `JWT_SECRET` | um segredo longo: `openssl rand -base64 32` |
| `CRON_SECRET` | segredo do cron de lembretes (`openssl rand -base64 32`). A Vercel envia automaticamente no header do cron. |

### Lembretes automáticos (Vercel Cron)
O `vercel.json` já agenda `/api/cron/lembretes` de hora em hora — ele avisa os
responsáveis dos eventos que começam nas próximas 24h. No **plano Hobby**, a Vercel
pode limitar a frequência (rodar 1x/dia); se precisar de hora em hora, ajuste o
`schedule` ou faça upgrade. Defina o `CRON_SECRET` pra proteger o endpoint.

> ⚠️ O `JWT_SECRET` é usado tanto nas API Routes quanto no **Edge Middleware** —
> defina-o no painel da Vercel, senão o middleware barra todo mundo.

## 4. Banco

O schema já está no Neon. Se precisar reaplicar (banco novo):

```bash
export DATABASE_URL="postgresql://..."
npm run db:migrate
npm run db:seed     # opcional: dados de exemplo
```

## 5. Deploy

Clique em **Deploy**. A cada `git push` na branch `main`, a Vercel publica de novo.

## Checklist pós-deploy

- [ ] Abrir a URL → cair em `/login`.
- [ ] Logar (`lideranca@afro.org` / `quebrada123` se rodou o seed) → ver os territórios.
- [ ] Criar um evento pela Central de Comando (precisa da `ANTHROPIC_API_KEY`).
- [ ] **Trocar a senha do banco no Neon** (a antiga foi exposta) e atualizar `DATABASE_URL`.
- [ ] Trocar as senhas do seed antes de uso real.

## Notas de plataforma

- O driver `@neondatabase/serverless` fala HTTP — sem pool TCP, não estoura o limite
  de conexões do plano gratuito do Neon nas funções serverless.
- As API Routes rodam com `runtime = "nodejs"` (bcrypt/jose/Neon). O middleware roda
  no Edge (só `jose`).
- O Neon "escala a zero" quando inativo; a primeira request após ociosidade pode ter
  um pequeno cold start no banco — normal no plano gratuito.
