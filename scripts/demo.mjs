// Uso: node scripts/demo.mjs
// Cria 3 territórios de demonstração com agenda, tarefas, um professor e o
// fluxo de relatório (aula com responsável, relatório pendente e entregue).
// Idempotente: limpa execuções anteriores destes 3 nomes antes de recriar.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}
const sql = neon(url);
const hash = await bcrypt.hash("quebrada123", 10);

const lider = (
  await sql("SELECT id FROM usuarios WHERE papel='lideranca' ORDER BY id LIMIT 1")
)[0]?.id;
if (!lider) {
  console.error("Nenhuma liderança. Rode antes: npm run db:seed");
  process.exit(1);
}
const marielle = (await sql("SELECT id FROM usuarios WHERE email='comunica@afro.org'"))[0]?.id;
const beatriz = (await sql("SELECT id FROM usuarios WHERE email='cultura@afro.org'"))[0]?.id;

// Professor (idempotente por e-mail)
let professor = (await sql("SELECT id FROM usuarios WHERE email='professor@afro.org'"))[0]?.id;
if (!professor) {
  professor = (
    await sql(
      "INSERT INTO usuarios (nome,email,senha_hash,papel) VALUES ($1,$2,$3,'professor') RETURNING id",
      ["Edu (Professor de DJ)", "professor@afro.org", hash],
    )
  )[0].id;
}

const nomes = ["Núcleo Periférico", "HipHop em Extensão", "Liderança Política"];
for (const nome of nomes) {
  const rows = await sql("SELECT id FROM territorios WHERE nome=$1", [nome]);
  for (const { id } of rows) {
    await sql("DELETE FROM tarefa_responsaveis WHERE tarefa_id IN (SELECT id FROM tarefas WHERE territorio_id=$1)", [id]);
    await sql("DELETE FROM notificacoes WHERE territorio_id=$1", [id]);
    await sql("DELETE FROM tarefas WHERE territorio_id=$1", [id]);
    await sql("DELETE FROM eventos WHERE territorio_id=$1", [id]); // cascateia relatorios
    await sql("DELETE FROM coletivo_permissoes WHERE territorio_id=$1", [id]);
    await sql("DELETE FROM territorios WHERE id=$1", [id]);
  }
}

async function territorio(nome, descricao, cor, icone) {
  return (
    await sql(
      "INSERT INTO territorios (nome,descricao,cor,icone,lideranca_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [nome, descricao, cor, icone, lider],
    )
  )[0].id;
}
async function perm(usuario, terr, funcao) {
  if (!usuario) return;
  await sql(
    `INSERT INTO coletivo_permissoes (usuario_id,territorio_id,nivel_acesso,funcao)
     VALUES ($1,$2,'editor',$3)
     ON CONFLICT (usuario_id,territorio_id) DO UPDATE SET funcao=EXCLUDED.funcao`,
    [usuario, terr, funcao],
  );
}
async function evento(terr, titulo, inicio, local, status = "agendado", descricao = null, responsavel = null, relStatus = "nao_solicitado") {
  const id = (
    await sql(
      "INSERT INTO eventos (territorio_id,titulo,descricao,local,inicio,status,responsavel_id,relatorio_status,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
      [terr, titulo, descricao, local, inicio, status, responsavel, relStatus, lider],
    )
  )[0].id;
  return id;
}
async function tarefa(terr, titulo, prioridade, status, responsavel) {
  const id = (
    await sql(
      "INSERT INTO tarefas (territorio_id,titulo,prioridade,status,criado_por) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [terr, titulo, prioridade, status, lider],
    )
  )[0].id;
  if (responsavel) {
    await sql("INSERT INTO tarefa_responsaveis (tarefa_id,usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, responsavel]);
    await sql("INSERT INTO notificacoes (usuario_id,territorio_id,titulo,tipo,referencia_id) VALUES ($1,$2,$3,'tarefa',$4)", [responsavel, terr, `Nova tarefa: ${titulo}`, id]);
  }
  return id;
}
async function entrega(tarefaId, autor, tipo, titulo, conteudo) {
  await sql(
    "INSERT INTO entregas (tarefa_id,autor_id,tipo,titulo,conteudo) VALUES ($1,$2,$3,$4,$5)",
    [tarefaId, autor, tipo, titulo, conteudo],
  );
}

// ── 1) Núcleo Periférico ────────────────────────────────────────────────────
const nucleo = await territorio("Núcleo Periférico", "Base comunitária, mobilização e cultura na quebrada", "#9A3412", "comunidade");
await perm(marielle, nucleo, "comunicacao");
await perm(beatriz, nucleo, "cultura");
await evento(nucleo, "Roda de conversa: Juventude e Território", "2026-06-12 19:00:00", "CEU da Quebrada", "agendado", "Pauta: juventude, trabalho e direito à cidade");
await evento(nucleo, "Mutirão de limpeza do córrego", "2026-06-15 08:00:00", "Vila Esperança", "confirmado");
await evento(nucleo, "Plenária do Núcleo Periférico", "2026-06-20 18:30:00", "Salão comunitário", "agendado");
await evento(nucleo, "Feira de economia solidária", "2026-06-28 10:00:00", "Praça do Mercado", "confirmado");
await tarefa(nucleo, "Mobilizar moradores pra plenária", "alta", "em_andamento", marielle);
await tarefa(nucleo, "Conseguir som e tendas pra feira", "media", "aberta", beatriz);
await tarefa(nucleo, "Fechar parceria com a padaria do bairro", "baixa", "concluida", null);

// ── 2) HipHop em Extensão (com professor e relatórios) ──────────────────────
const hiphop = await territorio("HipHop em Extensão", "Projeto de cultura hip-hop: oficinas, batalhas e shows", "#D4A017", "musica");
await perm(marielle, hiphop, "comunicacao");
await perm(beatriz, hiphop, "cultura");
await perm(professor, hiphop, "educacao");
// Aula com relatório PENDENTE (liderança já pediu)
await evento(hiphop, "Oficina de DJ e produção musical", "2026-06-14 14:00:00", "Casa de Cultura", "realizado", "Turma 1 — fundamentos de beatmaking", professor, "pendente");
await evento(hiphop, "Batalha de rima 'Sangue Bom'", "2026-06-21 16:00:00", "Praça Central", "confirmado", "Premiação pros 3 primeiros + cypher aberto");
// Aula com relatório ENTREGUE
const gravacao = await evento(hiphop, "Gravação do clipe coletivo", "2026-06-07 09:00:00", "Estúdio da Quebrada", "realizado", "Clipe da turma de produção", professor, "entregue");
await sql(
  "INSERT INTO relatorios (evento_id,autor_id,conteudo) VALUES ($1,$2,$3)",
  [gravacao, professor, "Presença: 9 jovens. Gravamos 2 faixas e o refrão do clipe coletivo. Faltou tripé pra câmera — encaminho a compra. Próximo passo: edição na semana que vem."],
);
await evento(hiphop, "Show de encerramento do módulo", "2026-07-05 20:00:00", "Galpão Cultural", "agendado");
await tarefa(hiphop, "Divulgar a batalha nas redes", "alta", "em_andamento", marielle);
await tarefa(hiphop, "Fechar o line-up do show", "media", "aberta", beatriz);
await tarefa(hiphop, "Reservar o estúdio de gravação", "media", "concluida", null);

// Livro coletivo — cada um responsável por um capítulo (com entregas/links)
const cap1 = await tarefa(hiphop, "Livro coletivo — Cap. 1: Origens do rap na quebrada", "alta", "em_andamento", professor);
await entrega(cap1, professor, "link", "Rascunho do Cap. 1 (Google Docs)", "https://docs.google.com/document/d/rascunho-cap1");
await entrega(cap1, professor, "texto", null, "Já tenho a intro e a linha do tempo até 2010. Falta revisar as fontes orais com os antigos.");
const cap2 = await tarefa(hiphop, "Livro coletivo — Cap. 2: A cena hoje", "media", "em_andamento", marielle);
await entrega(cap2, marielle, "link", "Pasta de entrevistas (Drive)", "https://drive.google.com/drive/folders/entrevistas-cap2");
const cap3 = await tarefa(hiphop, "Livro coletivo — Cap. 3: Mulheres no movimento", "alta", "aberta", beatriz);
await sql("UPDATE tarefas SET prazo = current_date - interval '2 days' WHERE id=$1", [cap3]); // atrasada

// ── 3) Liderança Política ───────────────────────────────────────────────────
const politica = await territorio("Liderança Política", "Articulação institucional, formação e incidência política", "#B45309", "predio");
await perm(marielle, politica, "comunicacao");
await evento(politica, "Reunião de articulação com lideranças", "2026-06-10 09:00:00", "Gabinete", "confirmado");
await evento(politica, "Audiência pública sobre moradia", "2026-06-18 14:00:00", "Câmara Municipal", "confirmado", "Defesa das ocupações e do programa de moradia popular");
await evento(politica, "Formação política: Poder e Território", "2026-06-22 19:00:00", "Sede do mandato", "agendado");
await evento(politica, "Ato unificado pela igualdade racial", "2026-07-02 15:00:00", "Centro da cidade", "agendado");
await tarefa(politica, "Preparar a fala da audiência", "alta", "em_andamento", beatriz);
await tarefa(politica, "Articular presença das bases no ato", "alta", "aberta", marielle);
await tarefa(politica, "Enviar ofícios aos vereadores", "media", "concluida", null);

// Compromissos de HOJE (pra dashboard mostrar algo) — usam current_date
await sql(
  "INSERT INTO eventos (territorio_id,titulo,local,inicio,status,responsavel_id,criado_por) VALUES ($1,$2,$3, current_date + time '14:00','confirmado',$4,$5)",
  [hiphop, "Reunião do livro coletivo", "Casa de Cultura", professor, lider],
);
await sql(
  "INSERT INTO eventos (territorio_id,titulo,local,inicio,status,criado_por) VALUES ($1,$2,$3, current_date + time '17:00','agendado',$4)",
  [politica, "Alinhamento do mandato", "Gabinete", lider],
);
await sql(
  "INSERT INTO eventos (territorio_id,titulo,local,inicio,status,responsavel_id,criado_por) VALUES ($1,$2,$3, current_date + time '19:30','agendado',$4,$5)",
  [nucleo, "Roda de conversa na quebrada", "CEU da Quebrada", marielle, lider],
);

console.log("✓ Demo atualizada com professor e relatórios.");
console.log({ nucleo, hiphop, politica, professor });
console.log("Logins (senha quebrada123):");
console.log("  liderança: lideranca@afro.org | professor: professor@afro.org");
