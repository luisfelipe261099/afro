/**
 * Padrão de tecido afro/étnico — estampa em faixas (ondas, folhas, losangos,
 * zigue-zague e bolinhas) na paleta terra/terracota/dourado/magenta/verde.
 *
 * Desenhado como um "tile" SVG de 60×150 que repete (patternUnits=userSpaceOnUse)
 * preenchendo qualquer área — vira um fundo de tecido sem fim.
 */
export function PadraoAfro({
  className = "",
  id = "afroTile",
}: {
  className?: string;
  id?: string;
}) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="60" height="150" patternUnits="userSpaceOnUse">
          {/* Fundos das faixas */}
          <rect x="0" y="0" width="60" height="40" fill="#E2711D" />
          <rect x="0" y="40" width="60" height="34" fill="#C81D6B" />
          <rect x="0" y="74" width="60" height="34" fill="#2E8B57" />
          <rect x="0" y="108" width="60" height="26" fill="#E8B500" />
          <rect x="0" y="134" width="60" height="16" fill="#9A3412" />

          {/* Faixa 1 — ondas */}
          <path
            d="M0,18 q15,-13 30,0 t30,0"
            fill="none"
            stroke="#8A3B12"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M0,30 q15,13 30,0 t30,0"
            fill="none"
            stroke="#2E8B57"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="15" cy="9" r="2" fill="#E8B500" />
          <circle cx="45" cy="9" r="2" fill="#E8B500" />

          {/* Faixa 2 — folhas (triângulos com veio) */}
          <path d="M15,70 L7,47 L23,47 Z" fill="#2E8B57" />
          <path d="M15,70 L15,49" stroke="#E8B500" strokeWidth="1.5" />
          <path d="M45,70 L37,47 L53,47 Z" fill="#E8B500" />
          <path d="M45,70 L45,49" stroke="#9A3412" strokeWidth="1.5" />

          {/* Faixa 3 — losangos */}
          <path d="M15,78 L25,91 L15,104 L5,91 Z" fill="#E2711D" stroke="#1C1410" strokeWidth="1.5" />
          <circle cx="15" cy="91" r="2.5" fill="#F5EDE3" />
          <path d="M45,78 L55,91 L45,104 L35,91 Z" fill="#C81D6B" stroke="#1C1410" strokeWidth="1.5" />
          <circle cx="45" cy="91" r="2.5" fill="#E8B500" />
          <path d="M0,91 L5,91 M55,91 L60,91" stroke="#1C1410" strokeWidth="1.5" />

          {/* Faixa 4 — zigue-zague */}
          <path
            d="M0,128 L15,116 L30,128 L45,116 L60,128"
            fill="none"
            stroke="#9A3412"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M0,131 L15,119 L30,131 L45,119 L60,131"
            fill="none"
            stroke="#1C1410"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Faixa 5 — bolinhas */}
          <circle cx="10" cy="142" r="3" fill="#E8B500" />
          <circle cx="30" cy="142" r="3" fill="#F5EDE3" />
          <circle cx="50" cy="142" r="3" fill="#E8B500" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
