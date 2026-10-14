import type { Exercise, PR, Workout } from '../types'
import { isDurationExercise } from './duration'

/**
 * Los récords se derivan del historial, no se guardan aparte.
 *
 * Antes cada entreno terminado escribía en una lista de PRs que después nadie
 * volvía a tocar: borrar el entreno del récord dejaba el récord huérfano, y
 * corregir un peso mal cargado dejaba vivo el récord equivocado para siempre.
 * Recalcular desde los entrenos es un poco más de trabajo por render y a cambio
 * los récords no pueden desincronizarse nunca.
 */

/** Qué mide el récord de este ejercicio. */
export type RecordKind = 'kg' | 'reps' | 'tiempo'

export function recordKindFor(exercise: Exercise | undefined, sets: { kg: number }[]): RecordKind {
  if (isDurationExercise(exercise)) return 'tiempo'
  // Sin kilos en la mayoría de las series es un ejercicio a peso corporal:
  // progresa en repeticiones (dominadas, abdominales, fondos). Se decide por
  // mayoría y no por "alguna serie con kilos": una sola dominada con lastre
  // pasaba todo el historial a kilos y borraba el récord de reps.
  if (sets.length === 0) return 'reps'
  const conKilos = sets.filter((s) => s.kg > 0).length
  return conKilos * 2 > sets.length ? 'kg' : 'reps'
}

/**
 * Un récord es mejor que otro con el criterio que corresponde al ejercicio:
 * más kilos (y a igual peso, más reps), más repeticiones, o más tiempo.
 */
function esMejor(kind: RecordKind, candidato: PR, actual: PR | undefined): boolean {
  if (!actual) return true
  switch (kind) {
    case 'kg':
      return candidato.kg > actual.kg || (candidato.kg === actual.kg && candidato.reps > actual.reps)
    case 'reps':
      return candidato.reps > actual.reps
    case 'tiempo':
      return (candidato.durationSec ?? 0) > (actual.durationSec ?? 0)
  }
}

/**
 * Recalcula todos los récords a partir de los entrenos terminados.
 * El calentamiento nunca cuenta. El historial de cada récord queda ordenado
 * cronológicamente con las marcas que fue superando.
 */
export function computeRecords(workouts: Workout[], exercises: Exercise[]): PR[] {
  const porFecha = workouts
    .filter((w) => w.finishedAt)
    .sort((a, b) => a.startedAt - b.startedAt)

  const exercisePorId = new Map(exercises.map((e) => [e.id, e]))
  // Primero necesitamos saber con qué criterio se mide cada ejercicio, y eso
  // depende de todas sus series (uno a peso corporal no tiene kilos en ninguna).
  const seriesPorEjercicio = new Map<string, { kg: number }[]>()
  for (const w of porFecha) {
    for (const we of w.exercises) {
      const acc = seriesPorEjercicio.get(we.exerciseId) ?? []
      for (const s of we.sets) if (!s.isWarmup) acc.push(s)
      seriesPorEjercicio.set(we.exerciseId, acc)
    }
  }

  const mejores = new Map<string, PR>()
  for (const w of porFecha) {
    for (const we of w.exercises) {
      const kind = recordKindFor(exercisePorId.get(we.exerciseId), seriesPorEjercicio.get(we.exerciseId) ?? [])
      for (const s of we.sets) {
        if (s.isWarmup) continue
        // Una serie vacía no es una marca.
        if (kind === 'tiempo' ? !s.durationSec : s.reps <= 0) continue
        const candidato: PR = {
          exerciseId: we.exerciseId,
          kg: s.kg,
          reps: s.reps,
          durationSec: s.durationSec,
          date: w.startedAt,
          history: [],
        }
        const actual = mejores.get(we.exerciseId)
        if (esMejor(kind, candidato, actual)) {
          candidato.history = actual
            ? [...(actual.history ?? []), { kg: actual.kg, reps: actual.reps, durationSec: actual.durationSec, date: actual.date }]
            : []
          mejores.set(we.exerciseId, candidato)
        }
      }
    }
  }
  return [...mejores.values()]
}

/**
 * Los récords que aparecieron (o mejoraron) entre dos cálculos. Se usa para
 * avisar "2 PRs nuevos" al terminar un entreno.
 */
export function newRecords(antes: PR[], despues: PR[]): PR[] {
  const previos = new Map(antes.map((p) => [p.exerciseId, p]))
  return despues.filter((p) => {
    const viejo = previos.get(p.exerciseId)
    if (!viejo) return true
    return viejo.kg !== p.kg || viejo.reps !== p.reps || viejo.durationSec !== p.durationSec
  })
}

/** Las cantidades de repeticiones que muestra la tabla de récords por reps. */
export const REPS_TABLA = [5, 8, 10, 12, 15] as const

/**
 * El mejor peso que se movió para cada cantidad de repeticiones: una serie de
 * 40 × 10 cuenta para 5, 8 y 10 (si hiciste 10, hiciste 8). Sin calentamiento.
 */
export function recordsPorReps(
  exerciseId: string,
  workouts: Workout[],
): Array<{ reps: number; kg: number; date: number } | null> {
  const mejor = REPS_TABLA.map(() => null as { reps: number; kg: number; date: number } | null)
  for (const w of workouts) {
    if (!w.finishedAt) continue
    for (const wex of w.exercises) {
      if (wex.exerciseId !== exerciseId) continue
      for (const s of wex.sets) {
        if (s.isWarmup || s.kg <= 0) continue
        REPS_TABLA.forEach((n, i) => {
          if (s.reps < n) return
          const actual = mejor[i]
          if (!actual || s.kg > actual.kg || (s.kg === actual.kg && w.startedAt < actual.date)) {
            mejor[i] = { reps: n, kg: s.kg, date: w.startedAt }
          }
        })
      }
    }
  }
  return mejor
}
