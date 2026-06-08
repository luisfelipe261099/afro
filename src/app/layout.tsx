import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Plataforma Afro — Territórios & Coletivo",
  description: "Gestão de agendas, projetos e coletivo da quebrada com IA",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1C1410",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // dark por padrão — a plataforma nasce escura
    <html lang="pt-BR" className={`dark ${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
