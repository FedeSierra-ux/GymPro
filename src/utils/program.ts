/**
 * Programa por semanas (el plan de Mile: 6 semanas, cambia en la 4).
 * Se guarda el lunes de la semana 1; la semana actual sale de la fecha.
 */
export const SEMANAS_PROGRAMA = 6
export const SEMANA_CAMBIO = 4

export interface ProgramaEstado {
  /** Lunes (a las 00:00 locales) de la semana 1. */
  inicio: number
  /** Bloque que se aplicó a las rutinas por última vez: así un cambio manual no se pisa en cada apertura. */
  fase: 'base' | 'alt'
  /** El usuario dio por terminado el plan después de la semana 6. */
  terminado?: boolean
}

/** Lunes 00:00 de la semana de `ts`. */
export function lunesDe(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime()
}

/** Semana del programa (1 = la primera). Redondea para no tropezar con el cambio de horario. */
export function semanaDelPrograma(inicio: number, nowTs: number): number {
  return Math.round((lunesDe(nowTs) - inicio) / (7 * 86400000)) + 1
}

/**
 * Inicio para que hoy caiga en la semana `semana`. Un domingo, la semana que
 * se elige es la que arranca mañana: es el día en que uno se organiza, y
 * contarla desde el lunes que pasó hacía que al otro día ya fuera la siguiente.
 */
export function inicioParaSemana(semana: number, nowTs: number): number {
  const hoy = new Date(nowTs)
  const referencia = hoy.getDay() === 0
    ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 12).getTime()
    : nowTs
  const lunes = new Date(lunesDe(referencia))
  return new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - (semana - 1) * 7).getTime()
}

export function faseDeSemana(semana: number): 'base' | 'alt' {
  return semana >= SEMANA_CAMBIO ? 'alt' : 'base'
}
