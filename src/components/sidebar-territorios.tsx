"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Territorio = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  nivel_acesso: string;
  funcao: string | null;
};

export function SidebarTerritorios({
  territorios,
}: {
  territorios: Territorio[];
}) {
  const params = useParams<{ id?: string }>();
  const ativo = params?.id;

  return (
    <nav className="space-y-1.5">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Territórios
      </p>
      {territorios.map((t) => {
        const selecionado = String(t.id) === String(ativo);
        return (
          <Link
            key={t.id}
            href={`/app/territorio/${t.id}`}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition",
              selecionado
                ? "border-primary/60 bg-primary/10"
                : "border-transparent hover:bg-muted",
            )}
          >
            <span
              className="mt-0.5 h-7 w-7 shrink-0 rounded-full ring-2 ring-black/20"
              style={{ backgroundColor: t.cor }}
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold text-foreground">
                {t.nome}
              </span>
              {t.descricao && (
                <span className="block truncate text-xs text-muted-foreground">
                  {t.descricao}
                </span>
              )}
            </span>
          </Link>
        );
      })}
      {territorios.length === 0 && (
        <p className="px-2 text-sm text-muted-foreground">
          Nenhum território ainda.
        </p>
      )}
    </nav>
  );
}
