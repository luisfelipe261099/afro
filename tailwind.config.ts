import type { Config } from "tailwindcss";

/**
 * Paleta afro-periférica / urbana — tons de terra, terracota e dourado sobre
 * um dark mode sofisticado. As cores semânticas (shadcn) leem variáveis CSS
 * definidas em globals.css, então dá pra trocar tema sem mexer nos componentes.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        // Tokens semânticos (shadcn) -> variáveis CSS
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Paleta-marca crua (use direta: bg-terracota, text-dourado…)
        terracota: "#C2410C",
        barro: "#9A3412",
        dourado: "#D4A017",
        ocre: "#B45309",
        terra: "#78350F",
        cafe: "#1C1410", // fundo dark base
        carvao: "#0F0B08",
        creme: "#F5EDE3", // texto claro quente
        folha: "#3F6212", // verde de acento (axé/ancestralidade)
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      backgroundImage: {
        // Textura sutil de "barro" para headers e cards de destaque
        "gradiente-terra":
          "radial-gradient(120% 120% at 0% 0%, #9A3412 0%, #1C1410 55%)",
        "gradiente-ouro":
          "linear-gradient(135deg, #D4A017 0%, #B45309 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
