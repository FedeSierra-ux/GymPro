import plugin from 'tailwindcss/plugin'
import { colors as t, text, radius } from './design-tokens.js'

/** `surf2` → `--surf2`, `onAcc` → `--on-acc`. */
const variable = (nombre) => `--${nombre.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // La escala tipográfica de design-tokens.js reemplaza a la de Tailwind:
    // así no conviven 16 tamaños. `hero` es sólo para el reloj del descanso.
    fontSize: {
      micro: `${text.micro}px`,
      xs: `${text.caption}px`,
      sm: `${text.body}px`,
      base: `${text.bodyLg}px`,
      lg: `${text.title}px`,
      xl: `${text.h2}px`,
      '2xl': `${text.h1}px`,
      '3xl': `${text.display}px`,
      hero: '52px',
    },
    extend: {
      colors: {
        // Tokens de diseño — definidos una sola vez en design-tokens.js
        bg: t.bg,
        surf: t.surf,
        surf2: t.surf2,
        ink: t.ink,
        dim: t.dim,
        mute: t.mute,
        faint: t.faint,
        acc: t.acc,
        'on-acc': t.onAcc,
        acc2: t.acc2,
        good: t.good,
        bad: t.bad,
        line: t.line,
        line2: t.line2,
        // Alias con los nombres que usan las pantallas escritas con clases
        background: t.bg,
        surface: { DEFAULT: t.surf, elevated: t.surf2 },
        card: t.surf,
        border: { DEFAULT: t.line, hi: t.line2 },
        primary: { DEFAULT: t.acc, dim: t.accDim, muted: 'rgba(232,99,74,0.15)' },
        info: { DEFAULT: t.info, muted: 'rgba(56,189,248,0.15)' },
        gold: { DEFAULT: t.acc2, muted: 'rgba(242,169,59,0.15)' },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [
    // Las variables CSS (--bg, --acc, --mute…, y los radios --r-sm…--r-xl)
    // salen de los mismos tokens: antes index.css las repetía a mano y se
    // desincronizaban. En clases, los radios de la escala son rounded-lg (8),
    // rounded-xl (12), rounded-2xl (16) y rounded-3xl (24), los de Tailwind.
    plugin(({ addBase }) => {
      addBase({
        ':root': Object.fromEntries([
          ...Object.entries(t).map(([k, v]) => [variable(k), v]),
          ...Object.entries(radius).map(([k, v]) => [`--r-${k}`, `${v}px`]),
        ]),
      })
    }),
  ],
}
