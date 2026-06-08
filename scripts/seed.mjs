// Uso: node scripts/seed.mjs
// Popula dados de exemplo no Neon. Senha de todos: "quebrada123" (troque depois!).
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}
const sql = neon(url);
const hash = await bcrypt.hash("quebrada123", 10);

async function inserir(texto, params) {
  const rows = await sql(texto, params);
  return rows[0].id;
}

const lider = await inserir(
  "INSERT INTO usuarios (nome,email,senha_hash,papel) VALUES ($1,$2,$3,$4) RETURNING id",
  ["Dandara (Liderança)", "lideranca@afro.org", hash, "lideranca"],
);
const comunica = await inserir(
  "INSERT INTO usuarios (nome,email,senha_hash,papel) VALUES ($1,$2,$3,$4) RETURNING id",
  ["Marielle (Comunicação)", "comunica@afro.org", hash, "assessor"],
);
const cultura = await inserir(
  "INSERT INTO usuarios (nome,email,senha_hash,papel) VALUES ($1,$2,$3,$4) RETURNING id",
  ["Beatriz (Cultura)", "cultura@afro.org", hash, "assessor"],
);

const tMandato = await inserir(
  "INSERT INTO territorios (nome,descricao,cor,icone,lideranca_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
  ["Mandato / Governo", "Agenda institucional e articulação política", "#B45309", "predio", lider],
);
const tMovimento = await inserir(
  "INSERT INTO territorios (nome,descricao,cor,icone,lideranca_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
  ["Movimento Negro / Afro", "Articulação do movimento negro", "#C2410C", "punho", lider],
);
const tBase = await inserir(
  "INSERT INTO territorios (nome,descricao,cor,icone,lideranca_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
  ["Base / Quebrada", "Projetos de base e cultura periférica", "#A16207", "comunidade", lider],
);

await sql(
  "INSERT INTO coletivo_permissoes (usuario_id,territorio_id,nivel_acesso,funcao) VALUES ($1,$2,$3,$4)",
  [comunica, tMovimento, "editor", "comunicacao"],
);
await sql(
  "INSERT INTO coletivo_permissoes (usuario_id,territorio_id,nivel_acesso,funcao) VALUES ($1,$2,$3,$4)",
  [comunica, tBase, "editor", "comunicacao"],
);
await sql(
  "INSERT INTO coletivo_permissoes (usuario_id,territorio_id,nivel_acesso,funcao) VALUES ($1,$2,$3,$4)",
  [cultura, tBase, "editor", "cultura"],
);

console.log("Seed pronto. Login: lideranca@afro.org / quebrada123");
console.log({ lider, tMandato, tMovimento, tBase });
