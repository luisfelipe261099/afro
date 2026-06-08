// Uso: node scripts/migrar.mjs
// Aplica o db/schema.sql no Neon (PostgreSQL). Lê DATABASE_URL do ambiente.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (ex.: export $(grep -v '^#' .env.local | xargs)).");
  process.exit(1);
}

const sql = neon(url);
const arquivo = readFileSync(join(aqui, "..", "db", "schema.sql"), "utf8");

// Remove comentários de linha e quebra por ';' (o schema não usa blocos $$).
const limpo = arquivo
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");

const statements = limpo
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await sql(stmt);
  console.log("✓", stmt.split("\n")[0].slice(0, 72));
}
console.log("\nSchema aplicado no Neon.");
