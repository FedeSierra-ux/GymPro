import { colors, text, radius, tabata, TAP_MIN } from '../design-tokens.js'

/**
 * Los tokens de diseño para las pantallas que estilan en línea.
 *
 * Importá `S` en vez de volver a escribir la paleta: sale del mismo objeto que
 * alimenta a tailwind.config.js y a las variables CSS, así que un color
 * cambiado acá cambia en toda la app. `S.tabata` son los colores del
 * cronómetro del tabata (ver design-tokens.js): quedan aparte para que no se
 * vuelvan variables CSS sueltas.
 */
export const S: Record<keyof typeof colors, string> & { tabata: Record<keyof typeof tabata, string> } = { ...colors, tabata }

/** Escala tipográfica con piso de 11px. Ver design-tokens.js. */
export const T: Record<keyof typeof text, number> = text

/** Radios: sm 8 (chips), md 12 (botones), lg 16 (tarjetas), xl 24 (hojas y modales). */
export const R: Record<keyof typeof radius, number> = radius

export { TAP_MIN }

/** Alto mínimo de un control que se toca con el dedo. */
export const tappable = {
  minHeight: TAP_MIN,
  minWidth: TAP_MIN,
}
