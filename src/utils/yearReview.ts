import type { BodyMeasure, Exercise, PR, Workout } from '../types'
import type { CicloPrograma } from './program'
import { lunesDe } from './program'
import {
  compararPeriodos, entrenosEn, resumenPeriodo, type ComparacionPeriodos, type RecordDelPeriodo, type ResumenPeriodo,
} from './periodSummary'
import { dayKey, inicioDeFaltas } from './trainingDays'

/**
 * "Tu año en el gym": el resumen del año calendario.
 *
 * El año arranca el día en que se empezó a usar la app si fue después del 1 de
 * enero: alguien que empezó en octubre tiene que leer "desde el 14 de octubre"
 * y no un año con nueve meses vacíos. Termina el 31 de diciembre o ahora, lo
 * que pase primero.
 */

/** Cosas para imaginarse el tonelaje, con su peso aproximado en kg y en orden de preferencia. */
export const EQUIVALENCIAS = [
  { cosa: 'elefantes', kg: 6000 },
  { cosa: 'autos', kg: 1500 },
  { cosa: 'pianos de cola', kg: 500 },
  { cosa: 'ballenas azules', kg: 150000 },
] as const

export type CosaPesada = (typeof EQUIVALENCIAS)[number]['cosa']

export interface Toneladas {
  /** Toneladas movidas, con un decimal. */
  total: number
  cantidad: number
  cosa: CosaPesada
}

/**
 * La primera equivalencia que da un número entre 2 y 200. Si ninguna entra
 * (muy poco o muchísimo), la más chica o la más grande, según el caso.
 */
export function equivalenciaToneladas(tonelajeKg: number): Toneladas | null {
  if (tonelajeKg <= 0) return null
  const redondear = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10)
  const total = Math.round(tonelajeKg / 100) / 10
  const elegida = EQUIVALENCIAS.find((e) => tonelajeKg / e.kg >= 2 && tonelajeKg / e.kg <= 200)
    ?? [...EQUIVALENCIAS].sort((a, b) => (tonelajeKg < 1000 ? a.kg - b.kg : b.kg - a.kg))[0]
  return { total, cantidad: redondear(tonelajeKg / elegida.kg), cosa: elegida.cosa }
}

export interface CambioMedida {
  desde: number
  hasta: number
  /** hasta − desde, con un decimal. */
  cambio: number
}

export interface ResumenAnual extends ResumenPeriodo {
  year: number
  /** true si se empezó a usar la app este año (el período no arranca el 1 de enero). */
  empezoEsteAnio: boolean
  /** Días corridos del período (no días entrenados: eso es `dias`). */
  diasDeUso: number
  toneladas: Toneladas | null
  recordsTotal: number
  /** Los 3 récords que más superaron a la marca anterior, en %. */
  topRecords: RecordDelPeriodo[]
  /**
   * El ejercicio con más récords del año (a igualdad, el de más series). Si no
   * hubo récords, el de más series.
   */
  ejercicioDelAnio: { exerciseId: string; series: number; records: number } | null
  /** El mes (0-11) con más series efectivas. */
  mesMasFuerte: { year: number; month: number; series: number } | null
  /** Semanas lunes-domingo seguidas con al menos un entreno. */
  mejorRachaSemanas: number
  /** Ciclos del plan que terminaron dentro del período. */
  ciclosCompletados: number
  /** Primera contra última medición del período. null si no hay dos mediciones de nada. */
  cuerpo: { weightKg: CambioMedida | null; cintura: CambioMedida | null } | null
  /** Contra el mismo tramo del año anterior, si ese tramo tuvo entrenos. */
  anioAnterior: ComparacionPeriodos | null
}

export interface ResumenAnualInput {
  workouts: Workout[]
  exercises: Exercise[]
  prs: PR[]
  measures: BodyMeasure[]
  ciclos: CicloPrograma[]
  inicioUso: number | null
  year: number
  nowTs: number
}

/** Inicio del período del resumen: el 1 de enero o el primer día de uso, lo que sea más tarde. */
function inicioDelPeriodo(year: number, inicioUso: number | null, workouts: Workout[]): { desde: number; empezo: boolean } {
  const enero = new Date(year, 0, 1).getTime()
  const primerUso = inicioDeFaltas(inicioUso, workouts)
  if (primerUso === null || primerUso <= enero) return { desde: enero, empezo: false }
  return { desde: primerUso, empezo: true }
}

/** El mismo instante un año antes (el 29 de febrero pasa al 1 de marzo). */
function unAnioAntes(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime()
}

function inicioDelDia(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function cambioMedida(measures: BodyMeasure[], key: 'weightKg' | 'cintura'): CambioMedida | null {
  const con = measures.filter((m) => typeof m[key] === 'number' && m[key]! > 0)
  if (con.length < 2) return null
  const a = con[0][key]!
  const b = con[con.length - 1][key]!
  return { desde: a, hasta: b, cambio: Math.round((b - a) * 10) / 10 }
}

export function resumenAnual({
  workouts, exercises, prs, measures, ciclos, inicioUso, year, nowTs,
}: ResumenAnualInput): ResumenAnual {
  const finAnio = new Date(year + 1, 0, 1).getTime()
  const { desde, empezo } = inicioDelPeriodo(year, inicioUso, workouts)
  const hasta = Math.max(desde, Math.min(finAnio, nowTs))
  const resumen = resumenPeriodo({ workouts, exercises, prs, desde, hasta })
  const ws = entrenosEn(workouts, desde, hasta)

  const diasDeUso = hasta > desde
    ? Math.round((inicioDelDia(hasta - 1) - inicioDelDia(desde)) / 86400000) + 1
    : 0

  // Récords: los que más superaron la marca anterior.
  const topRecords = resumen.records
    .filter((r) => r.pct !== null && r.pct > 0)
    .sort((a, b) => b.pct! - a.pct!)
    .slice(0, 3)

  // Series por ejercicio y por mes.
  const seriesPorEjercicio = new Map<string, number>()
  const seriesPorMes = new Map<string, { year: number; month: number; series: number }>()
  for (const w of ws) {
    const d = new Date(w.startedAt)
    const claveMes = `${d.getFullYear()}-${d.getMonth()}`
    const mes = seriesPorMes.get(claveMes) ?? { year: d.getFullYear(), month: d.getMonth(), series: 0 }
    for (const we of w.exercises) {
      const n = we.sets.filter((s) => !s.isWarmup).length
      mes.series += n
      if (n) seriesPorEjercicio.set(we.exerciseId, (seriesPorEjercicio.get(we.exerciseId) ?? 0) + n)
    }
    seriesPorMes.set(claveMes, mes)
  }
  const mesMasFuerte = [...seriesPorMes.values()].reduce<ResumenAnual['mesMasFuerte']>(
    (mejor, m) => (m.series > 0 && (!mejor || m.series > mejor.series) ? m : mejor), null)

  const recordsPorEjercicio = new Map<string, number>()
  for (const r of resumen.records) recordsPorEjercicio.set(r.exerciseId, (recordsPorEjercicio.get(r.exerciseId) ?? 0) + 1)
  let ejercicioDelAnio: ResumenAnual['ejercicioDelAnio'] = null
  for (const [exerciseId, series] of seriesPorEjercicio) {
    const records = recordsPorEjercicio.get(exerciseId) ?? 0
    if (!ejercicioDelAnio || records > ejercicioDelAnio.records
      || (records === ejercicioDelAnio.records && series > ejercicioDelAnio.series)) {
      ejercicioDelAnio = { exerciseId, series, records }
    }
  }

  // Racha de semanas: se recorren los lunes con aritmética de fechas.
  const semanasConEntreno = new Set(ws.map((w) => dayKey(lunesDe(w.startedAt))))
  let mejorRachaSemanas = 0
  let racha = 0
  const primerLunes = new Date(lunesDe(desde))
  for (let i = 0; ; i++) {
    const lunes = new Date(primerLunes.getFullYear(), primerLunes.getMonth(), primerLunes.getDate() + i * 7).getTime()
    if (lunes >= hasta) break
    racha = semanasConEntreno.has(dayKey(lunes)) ? racha + 1 : 0
    mejorRachaSemanas = Math.max(mejorRachaSemanas, racha)
  }

  const ciclosCompletados = ciclos.filter((c) => c.fin > desde && c.fin <= hasta).length

  const medidas = measures.filter((m) => m.date >= desde && m.date < hasta).sort((a, b) => a.date - b.date)
  const peso = cambioMedida(medidas, 'weightKg')
  const cintura = cambioMedida(medidas, 'cintura')

  const desdeAnterior = unAnioAntes(desde)
  const hastaAnterior = unAnioAntes(hasta)
  const anioAnterior = entrenosEn(workouts, desdeAnterior, hastaAnterior).length > 0
    ? compararPeriodos(resumen, resumenPeriodo({ workouts, exercises, prs, desde: desdeAnterior, hasta: hastaAnterior }))
    : null

  return {
    ...resumen,
    year,
    empezoEsteAnio: empezo,
    diasDeUso,
    toneladas: equivalenciaToneladas(resumen.tonelaje),
    recordsTotal: resumen.records.length,
    topRecords,
    ejercicioDelAnio,
    mesMasFuerte,
    mejorRachaSemanas,
    ciclosCompletados,
    cuerpo: peso || cintura ? { weightKg: peso, cintura } : null,
    anioAnterior,
  }
}

/** Mínimo de entrenos del año para ofrecer el resumen. Bajo a propósito: quien empezó en octubre tiene pocos. */
export const MIN_ENTRENOS_WRAPPED = 8

/**
 * El año cuyo resumen se ofrece en el Inicio, o null. Del 1 de diciembre al 15
 * de enero se ofrece el año que termina (en enero, el anterior), si tiene al
 * menos MIN_ENTRENOS_WRAPPED entrenos terminados.
 */
export function wrappedDisponible({ workouts, inicioUso, nowTs }: {
  workouts: Workout[]
  inicioUso: number | null
  nowTs: number
}): number | null {
  const hoy = new Date(nowTs)
  let year: number
  if (hoy.getMonth() === 11) year = hoy.getFullYear()
  else if (hoy.getMonth() === 0 && hoy.getDate() <= 15) year = hoy.getFullYear() - 1
  else return null
  const { desde } = inicioDelPeriodo(year, inicioUso, workouts)
  const hasta = Math.min(new Date(year + 1, 0, 1).getTime(), Math.max(desde, nowTs))
  return entrenosEn(workouts, desde, hasta).length >= MIN_ENTRENOS_WRAPPED ? year : null
}
