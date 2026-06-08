// Uso: node scripts/criar-hash.mjs "minhaSenha123"
// Gera o bcrypt hash para colar no seed.sql ou no cadastro inicial.
import bcrypt from "bcryptjs";

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/criar-hash.mjs "suaSenha"');
  process.exit(1);
}

const hash = await bcrypt.hash(senha, 10);
console.log(hash);
