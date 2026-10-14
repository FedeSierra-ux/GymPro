import type { Exercise, RoutineExercise, Workout } from '../types'
import { formatKg } from './format'
import { inferEquipmentType } from './exerciseMatch'

/**
 * Doble progresión: se mantiene el peso hasta completar TODAS las series en el
 * tope del rango de reps; recién ahí se sube el peso y se vuelve al piso del
 * rango. Es una sugerencia: la app propone, el usuario decide.
 */
export type ProgressionReason = 'subir' | 'mantener' | 'bajar' | 'primera-vez' | 'sin-datos'

export interface ProgressionSuggestion {
  /** Peso sugerido para la próxima serie. */
  kg: number
  reason: ProgressionReason
  /** Explicación corta, lista para mostrar. */
  note: string
  /** Reps objetivo de esta sesión (el piso del rango cuando se sube de peso). */
  targetReps: number
}

/** "8–12" o "10" cuando el plan fija un número exacto de reps. */
function rangeLabel(re: Pick<RoutineExercise, 'repsMin' | 'repsMax'>): string {
  return re.repsMin === re.repsMax ? `${re.repsMin}` : `${re.repsMin}–${re.repsMax}`
}

/** Si pasó más de esto desde la última vez, no sugerimos subir. */
const STALE_DAYS = 21

/** Salto de peso según el equipamiento, redondeado a lo que hay en un gimnasio. */
export function incrementFor(exercise?: Exercise | null): number {
  // Los ejercicios propios viejos pueden no tener el tipo: se deduce del texto.
  const tipo = exercise?.equipmentType ?? (exercise?.equipment ? inferEquipmentType(exercise.equipment) : undefined)
  switch (tipo) {
    case 'mancuernas':
      return 2 // 1 kg por lado, que es el salto real del rack
    case 'kettlebell':
      return 4
    case 'maquina':
    case 'cable':
      return 5
    case 'banda':
    case 'peso_corporal':
      return 0 // progresan en reps, no en kg
    case 'barra':
      return 2.5
    default:
      return 2.5
  }
}

/** Redondea al múltiplo de medio disco chico para no proponer 41,25 kg. */
function roundToStep(kg: number, step: number): number {
  if (step <= 0) return Math.round(kg * 2) / 2
  return Math.round(kg / step) * step
}

interface LastSession {
  kg: number
  reps: number[]
  /** Series efectivas hechas con menos peso que el más alto (una bajada, un back-off). */
  masLivianas: number
  date: number
}

/** Última sesión (no calentamiento) de ese ejercicio, con el peso más pesado usado. */
function lastSessionFor(exerciseId: string, workouts: Workout[]): LastSession | null {
  const done = workouts
    .filter(w => w.finishedAt)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))

  for (const workout of done) {
    const entry = workout.exercises.find(e => e.exerciseId === exerciseId)
    // El peso puede ser 0: abdominales, dominadas y todo lo que va a peso
    // corporal progresa en repeticiones.
    const sets = entry?.sets.filter(s => !s.isWarmup && s.reps > 0) ?? []
    if (!sets.length) continue
    const kg = Math.max(...sets.map(s => s.kg))
    return {
      kg,
      // Sólo cuentan las series hechas al peso más alto de esa sesión.
      reps: sets.filter(s => s.kg === kg).map(s => s.reps),
      masLivianas: sets.filter(s => s.kg < kg).length,
      date: workout.finishedAt ?? workout.startedAt,
    }
  }
  return null
}

/**
 * El peso más alto (sin calentamiento) de la última vez que se hizo el
 * ejercicio. Es lo que se prellena al arrancar: el máximo que ya se hizo, y
 * subirlo o no lo decide el usuario mirando la sugerencia.
 */
export function lastTopKg(exerciseId: string, workouts: Workout[]): number | null {
  const last = lastSessionFor(exerciseId, workouts)
  return last && last.kg > 0 ? last.kg : null
}

export function suggestNextWeight(
  exercise: Exercise | undefined,
  routineExercise: Pick<RoutineExercise, 'sets' | 'repsMin' | 'repsMax'>,
  workouts: Workout[],
  exerciseId: string,
): ProgressionSuggestion | null {
  // El cardio y los isométricos progresan en tiempo, no en kilos.
  if (exercise?.trackingType === 'duration') return null

  const last = lastSessionFor(exerciseId, workouts)
  if (!last) {
    return {
      kg: 0,
      reason: 'primera-vez',
      note: `Primera vez: buscá un peso que te deje llegar a ${rangeLabel(routineExercise)} reps con 1–2 en reserva.`,
      targetReps: routineExercise.repsMax,
    }
  }

  const step = incrementFor(exercise)
  const daysAgo = (Date.now() - last.date) / 86400000

  // Sin peso (peso corporal) la referencia son las reps, no los kilos.
  const bodyweight = last.kg <= 0

  if (daysAgo > STALE_DAYS && !bodyweight) {
    const paso = step || 2.5
    // Un 10 % abajo, en un peso que exista. Con pesos chicos el redondeo puede
    // dar lo mismo o más (4 kg en máquina → 5): ahí se baja un salto entero.
    let kg = roundToStep(last.kg * 0.9, paso)
    if (kg >= last.kg) kg = last.kg - paso
    // Si bajar un salto es demasiado (10 kg en polea → 5) o deja la barra en
    // cero, no se inventa un peso: se mantiene y se pide calma.
    if (kg <= 0 || kg < last.kg * 0.75) {
      return {
        kg: last.kg,
        reason: 'mantener',
        note: `Pasaron ${Math.round(daysAgo)} días: arrancá con ${formatKg(last.kg)} kg con calma y, si cuesta, bajá un poco.`,
        targetReps: routineExercise.repsMax,
      }
    }
    return {
      kg,
      reason: 'bajar',
      note: `Pasaron ${Math.round(daysAgo)} días: arrancá con ${formatKg(kg)} kg y subí de nuevo.`,
      targetReps: routineExercise.repsMax,
    }
  }

  // Doble progresión: todas las series del peso más alto en el tope del rango.
  const seriesCompletas = last.reps.length >= routineExercise.sets
  const todasAlTope = last.reps.every(r => r >= routineExercise.repsMax)

  if (seriesCompletas && todasAlTope) {
    if (step === 0 || bodyweight) {
      return {
        kg: last.kg,
        reason: 'subir',
        note: `Llegaste a ${routineExercise.repsMax} en todas: sumá repeticiones o lastre.`,
        targetReps: routineExercise.repsMax + 2,
      }
    }
    // Un salto exacto desde el peso de hoy, al medio kilo. Redondear al
    // múltiplo del salto convertía 3 + 2 en 6 (Math.round(2,5) = 3).
    const kg = Math.round((last.kg + step) * 2) / 2
    return {
      kg,
      reason: 'subir',
      note: `${last.reps.join('/')} la última vez: subí a ${formatKg(kg)} kg y volvé a ${routineExercise.repsMin} reps.`,
      targetReps: routineExercise.repsMin,
    }
  }

  // Muy lejos del piso del rango (10 kg × 1 con objetivo de 10): mantener el
  // peso para siempre no lleva a ningún lado. Se baja un salto.
  const mejorReps = Math.max(...last.reps)
  const lejosDelPiso = Math.max(1, Math.floor(routineExercise.repsMin * 0.7))
  if (!bodyweight && step > 0 && mejorReps < lejosDelPiso && last.kg - step > 0) {
    const kg = Math.round((last.kg - step) * 2) / 2
    return {
      kg,
      reason: 'bajar',
      note: `La última vez llegaste a ${mejorReps} con ${formatKg(last.kg)} kg: bajá a ${formatKg(kg)} kg y apuntá a ${rangeLabel(routineExercise)} reps.`,
      targetReps: routineExercise.repsMin,
    }
  }

  const faltan = last.reps.filter(r => r < routineExercise.repsMax).length
  const seriesFaltantes = Math.max(0, routineExercise.sets - last.reps.length)
  const carga = bodyweight ? 'el peso corporal' : `${formatKg(last.kg)} kg`
  // Las series que faltan al peso más alto pueden estar hechas con menos peso:
  // no "faltaron", se bajó el peso. El mensaje tiene que decir eso.
  const bajadas = Math.min(seriesFaltantes, last.masLivianas)
  if (bajadas > 0 && !bodyweight) {
    return {
      kg: last.kg,
      reason: 'mantener',
      note: bajadas === 1
        ? `Mantené ${carga}: la última vez hiciste 1 serie con menos peso. Buscá hacerlas todas con ${carga}.`
        : `Mantené ${carga}: la última vez hiciste ${bajadas} series con menos peso. Buscá hacerlas todas con ${carga}.`,
      targetReps: routineExercise.repsMax,
    }
  }
  return {
    kg: last.kg,
    reason: 'mantener',
    note: seriesFaltantes > 0
      ? `Mantené ${carga}: te ${seriesFaltantes > 1 ? `faltaron ${seriesFaltantes} series` : 'faltó 1 serie'} la última vez.`
      : `Mantené ${carga} hasta llegar a ${routineExercise.repsMax} en las ${routineExercise.sets} series (te ${faltan > 1 ? `faltan ${faltan}` : 'falta 1'}).`,
    targetReps: routineExercise.repsMax,
  }
}
