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
