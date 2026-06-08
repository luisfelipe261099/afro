import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PadraoAfro } from "@/components/padrao-afro";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-carvao">
      <PadraoAfro
        id="afroHome"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_120%,rgba(212,160,23,0.15),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-secondary">
          Da quebrada pro mundo
        </span>
        <h1 className="font-display text-4xl font-bold leading-tight text-creme sm:text-5xl md:text-6xl">
          Sua agenda, seus <span className="text-secondary">Territórios</span>,
          <br /> seu Coletivo — num corre só.
        </h1>
        <p className="mt-5 max-w-xl text-base text-creme/70 md:text-lg">
          Fala ou escreve o que precisa. A Central de Comando entende a linguagem
          da base, marca na agenda certa e aciona quem tem que ser acionado.
        </p>

        <div className="mt-10 flex gap-3">
          <Link href="/login">
            <Button variant="ouro" size="lg">
              Entrar no corre
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
