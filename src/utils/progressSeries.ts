import type { Exercise, Workout } from '../types'
import { recordKindFor, type RecordKind } from './records'

/**
 * Serie de progreso por sesión, no por mes.
 *
 * Las barras mensuales dejaban la mitad del gráfico vacío (seis columnas para
 * dos meses de historial) y escondían todo lo que pasa dentro del mes. Un punto
 * por sesión muestra la progresión real y entra en mucho menos alto.
 *
 * Además cada ejercicio se mide con la unidad que le corresponde: kilos para los
 * que llevan peso, repeticiones para los de peso corporal y segundos para los de
 * tiempo. Antes Progreso filtraba por kilos mayores a cero, así que abdominales,
 * dominadas, planchas y cinta simplemente no existían en esta pantalla.
 */

export interface SessionPoint {
  /** Momento de la sesión. */
  date: number
  /** El mejor valor de la sesión, en la unidad del ejercicio. */
  value: number
  /** Reps de la mejor serie (para el detalle "70 kg × 8"). */
  reps: number
}

export interface ExerciseSeries {
  exerciseId: string
  kind: RecordKind
  /** Ordenada de la sesión más vieja a la más nueva. */
  points: SessionPoint[]
  /** Mejor valor de la última sesión. */
  current: number
  /** Reps de esa última mejor serie. */
  currentReps: number
  /** Referencia contra la que se compara: la mejor marca de hace `weeksBack`. */
  baseline: number
  /** Diferencia contra la referencia, en la unidad del ejercicio. */
  change: number
  /** Sesiones registradas en el rango. */
  sessions: number
  /** Última vez que se hizo. */
  lastDate: number
  /** Sesiones seguidas desde la última vez que se superó la mejor marca. */
  sinMejora: number
}

/** A partir de cuántas sesiones sin superar la marca se considera estancado. */
export const SESIONES_ESTANCADO = 4

/**
 * Cuántas sesiones van desde la última que superó la mejor marca hasta ahora.
 * La primera sesión cuenta como marca, así que con [60, 60, 60, 60, 60] da 4.
 */
export function sesionesSinMejora(values: number[]): number {
  let mejor = -Infinity
  let desde = 0
  values.forEach((v, i) => {
    if (v > mejor) { mejor = v; desde = i }
  })
  return values.length === 0 ? 0 : values.length - 1 - desde
}

/** Estancado: varias sesiones sin superar la marca. El cardio y los isométricos quedan afuera. */
export function estaEstancado(serie: Pick<ExerciseSeries, 'kind' | 'sinMejora'>): boolean {
  return serie.kind !== 'tiempo' && serie.sinMejora >= SESIONES_ESTANCADO
}

/** Cuánto pesa una serie para elegir "la mejor" de la sesión, según la unidad. */
function valorDeSerie(kind: RecordKind, s: { kg: number; reps: number; durationSec?: number }): number {
  switch (kind) {
    case 'kg': return s.kg
    case 'reps': return s.reps
    case 'tiempo': return s.durationSec ?? 0
  }
}

/**
 * Para comparar dos series del mismo ejercicio: con kilos manda el peso y, a
 * igual peso, las reps. Así 40 × 12 supera a 40 × 8, que es justo lo que pide
 * la doble progresión antes de subir el peso.
 */
function puntajeDeSerie(kind: RecordKind, s: { kg: number; reps: number; durationSec?: number }): number {
  return kind === 'kg' ? s.kg * 1000 + s.reps : valorDeSerie(kind, s)
}

/** Unidad que se muestra al lado del número. */
export function unidadDe(kind: RecordKind): string {
  return kind === 'kg' ? 'kg' : kind === 'reps' ? 'reps' : 'seg'
}

/**
 * Construye la serie de cada ejercicio hecho en el rango.
 *
 * `weeksBack` fija contra qué se compara el progreso. Comparar contra el primer
 * mes con datos inflaba el porcentaje —el primer mes siempre es el más flojo— y
 * hacía que un progreso real y sostenido se viera como una caída.
 */
export function buildProgressSeries(
  workouts: Workout[],
  exercises: Exercise[],
  desde: number,
  nowTs: number,
  weeksBack = 8,
): ExerciseSeries[] {
  const porId = new Map(exercises.map((e) => [e.id, e]))
  const terminados = workouts
    .filter((w) => w.finishedAt && w.startedAt >= desde)
    .sort((a, b) => a.startedAt - b.startedAt)

  // Con qué unidad se mide cada ejercicio: hace falta ver todas sus series.
  const seriesTodas = new Map<string, { kg: number }[]>()
  for (const w of terminados) {
    for (const we of w.exercises) {
      const acc = seriesTodas.get(we.exerciseId) ?? []
      for (const s of we.sets) if (!s.isWarmup) acc.push(s)
      seriesTodas.set(we.exerciseId, acc)
    }
  }

  const porEjercicio = new Map<string, SessionPoint[]>()
  const puntajes = new Map<string, number[]>()
  for (const w of terminados) {
    for (const we of w.exercises) {
      const kind = recordKindFor(porId.get(we.exerciseId), seriesTodas.get(we.exerciseId) ?? [])
      let mejor: SessionPoint | null = null
      let mejorPuntaje = -Infinity
      for (const s of we.sets) {
        if (s.isWarmup) continue
        const value = valorDeSerie(kind, s)
        if (value <= 0) continue
        const puntaje = puntajeDeSerie(kind, s)
        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje
          mejor = { date: w.startedAt, value, reps: s.reps }
        }
      }
      if (!mejor) continue
      const acc = porEjercicio.get(we.exerciseId) ?? []
      acc.push(mejor)
      porEjercicio.set(we.exerciseId, acc)
      puntajes.set(we.exerciseId, [...(puntajes.get(we.exerciseId) ?? []), mejorPuntaje])
    }
  }

  const corteBaseline = nowTs - weeksBack * 7 * 86400000
  const salida: ExerciseSeries[] = []
  for (const [exerciseId, points] of porEjercicio) {
    if (points.length === 0) continue
    const kind = recordKindFor(porId.get(exerciseId), seriesTodas.get(exerciseId) ?? [])
    const ultimo = points[points.length - 1]
    // La referencia es la mejor marca anterior a la ventana de comparación; si
    // el ejercicio es nuevo y no hay nada antes, se usa la primera sesión.
    const previos = points.filter((p) => p.date < corteBaseline)
    const base = previos.length > 0 ? previos : [points[0]]
    const baseline = Math.max(...base.map((p) => p.value))
    salida.push({
      exerciseId,
      kind,
      points,
      current: ultimo.value,
      currentReps: ultimo.reps,
      baseline,
      change: Math.round((ultimo.value - baseline) * 100) / 100,
      sessions: points.length,
      lastDate: ultimo.date,
      sinMejora: sesionesSinMejora(puntajes.get(exerciseId) ?? points.map((p) => p.value)),
    })
  }
  return salida
}
