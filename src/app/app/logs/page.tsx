import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";

type Log = {
  usuario: string;
  acao: string;
  territorio: string | null;
  detalhe: string | null;
  quando: string;
};

const rotulo: Record<string, string> = {
  viu_territorio: "abriu um território",
  viu_minha_agenda: "abriu a própria agenda",
};

export default async function LogsPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.papel !== "lideranca") redirect("/app");

  const logs = await consultar<Log>(
    `SELECT u.nome AS usuario, a.acao, a.detalhe,
            t.nome AS territorio,
            to_char(a.criado_em, 'DD/MM/YYYY HH24:MI') AS quando
       FROM acesso_logs a
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN territorios t ON t.id = a.territorio_id
      ORDER BY a.criado_em DESC
      LIMIT 100`,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
        <Eye className="h-6 w-6 text-secondary" /> Logs de acesso
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Quem acessou e viu o quê (últimos 100 registros).
      </p>

      <div className="overflow-hidden rounded-2xl border border-border">
        {logs.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Nenhum acesso registrado ainda.
          </p>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-sm last:border-0"
          >
            <span className="text-foreground">
              <strong className="font-medium">{l.usuario}</strong>{" "}
              <span className="text-muted-foreground">
                {rotulo[l.acao] ?? l.acao}
              </span>{" "}
              {l.territorio && (
                <span className="text-foreground/80">— {l.territorio}</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{l.quando}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
