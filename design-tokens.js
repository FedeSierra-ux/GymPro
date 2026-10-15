/**
 * Única fuente de verdad de los colores de la app.
 *
 * Antes había tres copias del mismo azul oscuro: las variables CSS de
 * index.css, la paleta de tailwind.config.js y un objeto `S` repetido a mano en
 * cada pantalla. Cambiar un color obligaba a acordarse de los tres lugares.
 * Ahora este archivo lo importan el CSS (vía tailwind), el config de tailwind y
 * `src/theme.ts`, así que se toca en un solo lado.
 */
export const colors = {
  bg: '#0C0E14',
  surf: '#161821',
  surf2: '#1C1F2A',
  ink: '#ECEEF4',
  dim: '#8A91A3',
  // Tercer nivel de texto (etiquetas, encabezados de tabla, ayudas): 4,3:1 a
  // 5,1:1 según el fondo. `faint` queda sólo para trazos y cosas deshabilitadas:
  // como texto daba 1,6:1 y no se leía.
  mute: '#7C8396',
  faint: '#3B3F4E',
  acc: '#E8634A',
  // Texto sobre coral: oscuro en todos los botones (5,8:1). El blanco daba 3,3:1.
  onAcc: '#0C0E14',
  accDim: '#d4553e',
  acc2: '#F2A93B',
  good: '#34D399',
  bad: '#f87171',
  info: '#38BDF8',
  line: 'rgba(236,238,244,0.07)',
  line2: 'rgba(236,238,244,0.12)',
}

/**
 * Colores de las rutinas: ninguno es un color de estado (coral = acción,
 * ámbar = récord, verde = hecho, rojo = error), así una rutina no se confunde
 * con un aviso. Son 8 para que la séptima no repita la primera.
 */
export const routinePalette = [
  '#38BDF8', // celeste
  '#A78BFA', // violeta
  '#F472B6', // rosa
  '#2DD4BF', // turquesa
  '#FB923C', // naranja
  '#818CF8', // índigo
  '#E879F9', // fucsia
  '#94A3B8', // gris azulado
]

/**
 * Un color por grupo muscular, separados unos 30° en el círculo cromático:
 * bíceps y glúteos (y espalda y cardio) ya no se confunden.
 */
export const muscleColors = {
  pecho: '#F87171',
  hombros: '#FB923C',
  core: '#FACC15',
  piernas: '#4ADE80',
  gluteos: '#2DD4BF',
  espalda: '#38BDF8',
  biceps: '#818CF8',
  triceps: '#C084FC',
  cardio: '#94A3B8',
}

/** Radios: chico (chips, inputs chicos), medio (botones), grande (tarjetas), hoja (modales y hojas). */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

/**
 * Escala tipográfica. El piso es 11px: más chico que eso no se lee en el
 * gimnasio, con el teléfono a un brazo de distancia y luz de tubo.
 */
export const text = {
  micro: 11,   // etiquetas de eje, leyendas, unidades
  caption: 12, // subtítulos y metadatos
  body: 13,
  bodyLg: 15,
  title: 17,
  h2: 22,
  h1: 26,
  display: 32,
}

/** Mínimo táctil recomendado por Apple; Material usa 48. */
export const TAP_MIN = 44

/**
 * Cronómetro del tabata, a pantalla completa. Va en un solo lugar para que
 * cambiar el color sea cambiar estos valores y nada más (hoy: coral suave).
 * - bg / ink: fondo de la fase de trabajo y el texto encima.
 * - ring / track: el arco del anillo y su riel; también las rondas hechas.
 * - chip: la píldora "Trabajo". soft: los botones redondos y "Sigue:".
 * - pause / pauseInk: el botón grande de pausa y su ícono.
 * - rest: en el descanso (fondo oscuro de la app), el anillo y el número.
 */
export const tabata = {
  bg: '#F29A87',
  ink: '#0C0E14',
  ring: '#0C0E14',
  track: 'rgba(12,14,20,.14)',
  chip: 'rgba(12,14,20,.12)',
  pause: '#0C0E14',
  pauseInk: '#F29A87',
  soft: 'rgba(12,14,20,.10)',
  rest: '#F29A87',
}
