import { NextResponse } from "next/server";
import { consultar, executar } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/cron/lembretes
 * Dispara lembretes dos eventos que começam nas próximas 24h e ainda não foram
 * avisados. Pensado pra rodar no Vercel Cron (ver vercel.json).
 *
 * Proteção: se CRON_SECRET estiver definido, exige
 * `Authorization: Bearer <CRON_SECRET>` (o Vercel Cron envia esse header).
 * Em dev, sem CRON_SECRET, roda livre.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  // Eventos nas próximas 24h, ainda não lembrados, com alguém pra avisar.
  const eventos = await consultar<{
    id: string;
    titulo: string;
    territorio_id: string;
    alvo: string;
    quando: string;
  }>(
    `SELECT id, titulo, territorio_id,
            COALESCE(responsavel_id, criado_por) AS alvo,
            to_char(inicio, 'DD/MM HH24:MI') AS quando
       FROM eventos
      WHERE status NOT IN ('cancelado','realizado')
        AND lembrete_enviado = FALSE
        AND inicio BETWEEN now() AND now() + interval '24 hours'`,
  );

  for (const ev of eventos) {
    await executar(
      `INSERT INTO notificacoes (usuario_id, territorio_id, titulo, mensagem, tipo, referencia_id)
       VALUES (?, ?, ?, ?, 'evento', ?)`,
      [ev.alvo, ev.territorio_id, `Lembrete: ${ev.titulo}`, `Começa ${ev.quando}`, ev.id],
    );
    await executar(`UPDATE eventos SET lembrete_enviado = TRUE WHERE id = ?`, [ev.id]);
  }

  return NextResponse.json({ ok: true, lembretes: eventos.length });
}
