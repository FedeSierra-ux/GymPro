/**
 * El logo de la app: el mismo dibujo que el ícono (public/favicon.svg), para
 * que lo primero que se ve al abrirla sea la marca que está en el teléfono.
 */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="GymPro">
      <defs>
        <linearGradient id="logo-fondo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171A24" />
          <stop offset="1" stopColor="#0C0E14" />
        </linearGradient>
        <linearGradient id="logo-marca" x1="0.08" y1="0.15" x2="0.92" y2="0.85">
          <stop offset="0" stopColor="#F2A93B" />
          <stop offset="1" stopColor="#E8634A" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill="url(#logo-fondo)" stroke="rgba(236,238,244,0.12)" strokeWidth="4" />
      <g transform="translate(15.36 15.36) scale(0.94)">
        <g fill="url(#logo-marca)">
          <rect x="200" y="222" width="112" height="68" rx="16" />
          <rect x="318" y="138" width="56" height="236" rx="20" />
          <rect x="138" y="138" width="56" height="236" rx="20" />
          <rect x="384" y="170" width="36" height="172" rx="16" />
          <rect x="92" y="170" width="36" height="172" rx="16" />
          <rect x="430" y="198" width="22" height="116" rx="11" />
          <rect x="60" y="198" width="22" height="116" rx="11" />
          <rect x="460" y="239" width="22" height="34" rx="11" />
          <rect x="30" y="239" width="22" height="34" rx="11" />
        </g>
        <g fill="#0C0E14" opacity="0.45">
          <rect x="234" y="238" width="8" height="36" rx="4" />
          <rect x="252" y="238" width="8" height="36" rx="4" />
          <rect x="270" y="238" width="8" height="36" rx="4" />
        </g>
      </g>
    </svg>
  )
}
