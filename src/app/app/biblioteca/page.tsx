import { redirect } from "next/navigation";
import { BookOpen, Link2, FileText } from "lucide-react";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { Card } from "@/components/ui/card";

type Item = {
  id: string;
  tipo: "link" | "texto";
  titulo: string | null;
  conteudo: string;
  quando: string;
  autor: string;
  tarefa: string;
  territorio_id: string;
  territorio: string;
  cor: string;
};

export default async function BibliotecaPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  const ids = usuario.territorios.map((t) => t.id);
  const itens =
    ids.length === 0
      ? []
      : await consultar<Item>(
          `SELECT e.id, e.tipo, e.titulo, e.conteudo,
                  to_char(e.criado_em, 'DD/MM/YYYY') AS quando,
                  au.nome AS autor, t.titulo AS tarefa,
                  ter.id AS territorio_id, ter.nome AS territorio, ter.cor
             FROM entregas e
             JOIN tarefas t ON t.id = e.tarefa_id
             JOIN territorios ter ON ter.id = t.territorio_id
             JOIN usuarios au ON au.id = e.autor_id
            WHERE t.territorio_id IN (${ids.map(() => "?").join(",")})
            ORDER BY ter.nome, e.criado_em DESC`,
          ids,
        );

  // agrupa por território
  const grupos = new Map<string, { nome: string; cor: string; itens: Item[] }>();
  for (const it of itens) {
    const g = grupos.get(it.territorio_id) ?? {
      nome: it.territorio,
      cor: it.cor,
      itens: [],
    };
    g.itens.push(it);
    grupos.set(it.territorio_id, g);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
        <BookOpen className="h-6 w-6 text-secondary" /> Biblioteca
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Todos os documentos, links e textos entregues nas tarefas — reunidos por território.
      </p>

      {itens.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nada na biblioteca ainda. As entregas das tarefas aparecem aqui.
        </p>
      )}

      <div className="space-y-6">
        {[...grupos.values()].map((g) => (
          <section key={g.nome}>
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg text-foreground">
              <span
                className="h-4 w-4 rounded-full ring-2 ring-black/20"
                style={{ backgroundColor: g.cor }}
              />
              {g.nome}
            </h2>
            <div className="space-y-2">
              {g.itens.map((it) => (
                <Card key={it.id} className="p-3">
                  {it.tipo === "link" ? (
                    <a
                      href={it.conteudo}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 font-medium text-secondary hover:underline"
                    >
                      <Link2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{it.titulo || it.conteudo}</span>
                    </a>
                  ) : (
                    <div className="flex items-start gap-2 text-sm text-foreground/90">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="whitespace-pre-wrap">{it.conteudo}</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.tarefa} · {it.autor} · {it.quando}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
