import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ListChecks,
  FileText,
  Bell,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
  AlertTriangle,
} from "lucide-react";
import { consultar, consultarUm } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  const ids = usuario.territorios.map((t) => t.id);
  const placeholders = ids.map(() => "?").join(",");
  const vazio = ids.length === 0;

  // Compromissos de HOJE (em todos os territórios que eu acesso)
  const hoje = vazio
    ? []
    : await consultar<{
        id: string;
        titulo: string;
        local: string | null;
        hora: string;
        territorio: string;
        cor: string;
        responsavel: string | null;
      }>(
        `SELECT e.id, e.titulo, e.local, to_char(e.inicio, 'HH24:MI') AS hora,
                ter.nome AS territorio, ter.cor, u.nome AS responsavel
           FROM eventos e
           JOIN territorios ter ON ter.id = e.territorio_id
           LEFT JOIN usuarios u ON u.id = e.responsavel_id
          WHERE e.territorio_id IN (${placeholders})
            AND e.inicio::date = current_date
            AND e.status <> 'cancelado'
          ORDER BY e.inicio`,
        ids,
      );

  // Próximos compromissos (depois de hoje)
  const proximos = vazio
    ? []
    : await consultar<{
        id: string;
        titulo: string;
        quando: string;
        territorio: string;
        cor: string;
      }>(
        `SELECT e.id, e.titulo, to_char(e.inicio, 'DD/MM HH24:MI') AS quando,
                ter.nome AS territorio, ter.cor
           FROM eventos e
           JOIN territorios ter ON ter.id = e.territorio_id
          WHERE e.territorio_id IN (${placeholders})
            AND e.inicio::date > current_date
            AND e.status <> 'cancelado'
          ORDER BY e.inicio
          LIMIT 6`,
        ids,
      );

  // Minhas tarefas abertas
  const minhasTarefas = await consultar<{
    id: string;
    titulo: string;
    status: string;
    territorio: string;
    cor: string;
  }>(
    `SELECT t.id, t.titulo, t.status, ter.nome AS territorio, ter.cor
       FROM tarefas t
       JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id AND tr.usuario_id = ?
       JOIN territorios ter ON ter.id = t.territorio_id
      WHERE t.status IN ('aberta','em_andamento')
      ORDER BY t.criado_em DESC
      LIMIT 6`,
    [usuario.id],
  );

  const cont = await consultarUm<{
    tarefas: number;
    relatorios: number;
    avisos: number;
  }>(
    `SELECT
       (SELECT count(*) FROM tarefas t
          JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id AND tr.usuario_id = $1
         WHERE t.status IN ('aberta','em_andamento')) AS tarefas,
       (SELECT count(*) FROM eventos
         WHERE responsavel_id = $1 AND relatorio_status = 'pendente') AS relatorios,
       (SELECT count(*) FROM notificacoes
         WHERE usuario_id = $1 AND lida = FALSE) AS avisos`,
    [usuario.id],
  );

  // ── Visão da liderança (coletivo todo) ──────────────────────────────────
  const ehAdmin = usuario.papel === "lideranca";
  let liderColetivo = 0;
  let liderTarefas = 0;
  let liderRelatorios = 0;
  let relatoriosPendentes: {
    id: string;
    titulo: string;
    territorio: string;
    cor: string;
    responsavel: string | null;
    quando: string;
  }[] = [];
  let tarefasAtrasadas: {
    id: string;
    titulo: string;
    territorio: string;
    cor: string;
    prazo: string;
    responsaveis: string | null;
  }[] = [];

  if (ehAdmin && !vazio) {
    liderColetivo =
      Number(
        (
          await consultarUm<{ c: number }>(
            `SELECT count(DISTINCT usuario_id) c FROM coletivo_permissoes WHERE territorio_id IN (${placeholders})`,
            ids,
          )
        )?.c,
      ) || 0;
    liderTarefas =
      Number(
        (
          await consultarUm<{ c: number }>(
            `SELECT count(*) c FROM tarefas WHERE territorio_id IN (${placeholders}) AND status IN ('aberta','em_andamento')`,
            ids,
          )
        )?.c,
      ) || 0;
    liderRelatorios =
      Number(
        (
          await consultarUm<{ c: number }>(
            `SELECT count(*) c FROM eventos WHERE territorio_id IN (${placeholders}) AND relatorio_status = 'pendente'`,
            ids,
          )
        )?.c,
      ) || 0;

    relatoriosPendentes = await consultar(
      `SELECT e.id, e.titulo, ter.nome AS territorio, ter.cor,
              u.nome AS responsavel, to_char(e.inicio, 'DD/MM') AS quando
         FROM eventos e
         JOIN territorios ter ON ter.id = e.territorio_id
         LEFT JOIN usuarios u ON u.id = e.responsavel_id
        WHERE e.territorio_id IN (${placeholders}) AND e.relatorio_status = 'pendente'
        ORDER BY e.inicio
        LIMIT 8`,
      ids,
    );

    tarefasAtrasadas = await consultar(
      `SELECT t.id, t.titulo, ter.nome AS territorio, ter.cor,
              to_char(t.prazo, 'DD/MM') AS prazo,
              STRING_AGG(DISTINCT u.nome, ', ') AS responsaveis
         FROM tarefas t
         JOIN territorios ter ON ter.id = t.territorio_id
         LEFT JOIN tarefa_responsaveis tr ON tr.tarefa_id = t.id
         LEFT JOIN usuarios u ON u.id = tr.usuario_id
        WHERE t.territorio_id IN (${placeholders})
          AND t.status IN ('aberta','em_andamento')
          AND t.prazo IS NOT NULL AND t.prazo < now()
        GROUP BY t.id, ter.nome, ter.cor
        ORDER BY t.prazo
        LIMIT 8`,
      ids,
    );
  }

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const stats = [
    { rotulo: "Hoje", valor: hoje.length, icone: CalendarDays, href: "/app/minha-agenda" },
    { rotulo: "Tarefas abertas", valor: cont?.tarefas ?? 0, icone: ListChecks, href: "/app/tarefas" },
    { rotulo: "Relatórios", valor: cont?.relatorios ?? 0, icone: FileText, href: "/app/minha-agenda" },
    { rotulo: "Avisos", valor: cont?.avisos ?? 0, icone: Bell, href: "/app/minha-agenda" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Saudação */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Salve, {usuario.nome.split(" ")[0]}! 👊🏾
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{dataHoje}</p>
      </div>

      {/* Cards de resumo */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.rotulo} href={s.href}>
            <Card className="p-4 transition hover:border-secondary/50">
              <div className="flex items-center justify-between">
                <s.icone className="h-5 w-5 text-secondary" />
                <span className="font-display text-2xl font-bold text-foreground">
                  {s.valor}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.rotulo}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Compromissos de hoje */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
          <CalendarDays className="h-5 w-5 text-secondary" /> Compromissos de hoje
        </h2>
        {hoje.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada marcado pra hoje. Dia livre — ou marque algo na sua agenda.
          </p>
        ) : (
          <div className="space-y-2">
            {hoje.map((ev) => (
              <Card key={ev.id} className="flex items-center gap-3 p-3">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span className="font-display text-sm font-bold text-foreground">
                    {ev.hora}
                  </span>
                </div>
                <span
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.cor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{ev.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ev.territorio}
                    {ev.local && (
                      <>
                        {" · "}
                        <MapPin className="inline h-3 w-3" /> {ev.local}
                      </>
                    )}
                    {ev.responsavel && <> · {ev.responsavel}</>}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Visão da liderança */}
      {ehAdmin && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
            <ShieldCheck className="h-5 w-5 text-secondary" /> Visão da liderança
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { rotulo: "Territórios", valor: usuario.territorios.length, icone: ShieldCheck },
              { rotulo: "No coletivo", valor: liderColetivo, icone: Users },
              { rotulo: "Tarefas abertas", valor: liderTarefas, icone: ListChecks },
              { rotulo: "Relatórios pendentes", valor: liderRelatorios, icone: FileText },
            ].map((s) => (
              <Card key={s.rotulo} className="p-4">
                <div className="flex items-center justify-between">
                  <s.icone className="h-5 w-5 text-secondary" />
                  <span className="font-display text-2xl font-bold text-foreground">
                    {s.valor}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.rotulo}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Relatórios pendentes — quem não entregou */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-secondary" /> Relatórios pendentes
              </h3>
              {relatoriosPendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tudo em dia. ✅</p>
              ) : (
                <div className="space-y-2">
                  {relatoriosPendentes.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: r.cor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">{r.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.territorio}
                          {r.responsavel && <> · {r.responsavel}</>}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.quando}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarefas atrasadas */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Tarefas atrasadas
              </h3>
              {tarefasAtrasadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atrasada. 👏🏾</p>
              ) : (
                <div className="space-y-2">
                  {tarefasAtrasadas.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: t.cor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">{t.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.territorio}
                          {t.responsaveis && <> · {t.responsaveis}</>}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-destructive">
                        venceu {t.prazo}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Próximos */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
            <CalendarDays className="h-5 w-5 text-secondary" /> Próximos
          </h2>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem compromissos à frente.</p>
          ) : (
            <div className="space-y-2">
              {proximos.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ev.cor }}
                  />
                  <span className="flex-1 truncate text-foreground">{ev.titulo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {ev.quando}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Minhas tarefas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
              <ListChecks className="h-5 w-5 text-secondary" /> Minhas tarefas
            </h2>
            <Link
              href="/app/tarefas"
              className="flex items-center gap-1 text-xs text-secondary hover:underline"
            >
              ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {minhasTarefas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma demanda aberta. 🎉</p>
          ) : (
            <div className="space-y-2">
              {minhasTarefas.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.cor }}
                  />
                  <span className="flex-1 truncate text-foreground">{t.titulo}</span>
                  <Badge tom={t.status === "em_andamento" ? "ouro" : "ocre"}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Atalhos de territórios */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg text-foreground">Seus territórios</h2>
        <div className="flex flex-wrap gap-2">
          {usuario.territorios.map((t) => (
            <Link
              key={t.id}
              href={`/app/territorio/${t.id}`}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: t.cor }}
              />
              {t.nome}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
