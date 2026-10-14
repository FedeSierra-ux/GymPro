import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeStorage, huboFalloDeEscritura } from '../utils/safeStorage'
import type { ActiveWorkoutExercise, ActiveWorkoutSet, AppToast, Exercise, Workout, WorkoutOrigen } from '../types'
import { useStore } from '../store/useStore'
import { isDurationExercise, durationUnit, toSeconds, fromSeconds } from '../utils/duration'
import { clampDecimalInput, normalizeIntegerInput, parseDecimal } from '../utils/numberInput'
import { lastTopKg } from '../utils/progression'
import { computeRecords, newRecords } from '../utils/records'
import { rutinaEnUso, tieneVariante } from '../utils/routineVariant'
import { semanaDeEntreno } from '../utils/program'
import { descansoDeNota } from '../utils/restFromNote'

export interface ActiveWorkout {
  routineId: string
  startedAt: number      // date the workout is recorded for (may be a past-date override)
  realStartedAt: number  // actual wall-clock time when the screen opened (for duration)
  /** 'manual' si se está cargando un entreno de otro día (desde la Agenda o cambiándole la fecha). */
  origen?: Exclude<WorkoutOrigen, 'auto'>
  exercises: ActiveWorkoutExercise[]
  restTimerVisible: boolean
  restSecondsLeft: number
  restTotalSeconds: number
  /**
   * Momento (epoch ms) en que termina el descanso. El contador se deriva de
   * este timestamp y no de restar 1 por segundo: iOS congela los timers cuando
   * la PWA queda en segundo plano o se bloquea la pantalla, así que un contador
   * incremental volvía con minutos de atraso.
   */
  restEndsAt?: number
  lastCompletedSet?: { exerciseId: string; setIdx: number; kg: number; reps: number }
  /** Descanso por defecto (el último que se eligió a mano) para los ejercicios cuya nota no dice nada. */
  restDefaultSeconds?: number
  /** Descanso elegido a mano para un ejercicio en este entreno: manda sobre la nota. */
  restPorEjercicio?: Record<string, number>
  livePr?: { exerciseId: string; kg: number; reps: number } | null
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null
  summaryWorkout: import('../types').Workout | null
  summaryPrCount: number

  startWorkout: (routineId: string, dateOverride?: number) => void
  /** Cambia el día al que se imputa el entreno en curso (cargar el de ayer). */
  setWorkoutDate: (timestamp: number) => void
  updateSetValue: (exerciseIdx: number, setIdx: number, field: 'kg' | 'reps' | 'duration', value: string) => void
  toggleSetWarmup: (exerciseIdx: number, setIdx: number) => void
  /**
   * Marca/desmarca la serie. `startRest` decide si además arranca el
   * cronómetro de descanso: el ✓ sólo confirma y el ✓⏱ confirma y cuenta.
   */
  completeSet: (exerciseIdx: number, setIdx: number, options?: { startRest?: boolean }) => void
  addSetToExercise: (exerciseIdx: number) => void
  /** Agrega un ejercicio al entreno en curso, al final o después de otro. */
  addExerciseToWorkout: (exerciseId: string, afterIdx?: number) => void
  /** Cambia un ejercicio por otro sólo en esta sesión; la rutina no se toca. */
  replaceExerciseInWorkout: (exerciseIdx: number, exerciseId: string) => void
  /** Saca un ejercicio del entreno en curso (la máquina ocupada, una molestia). */
  removeExerciseFromWorkout: (exerciseIdx: number) => void
  removeSetFromExercise: (exerciseIdx: number, setIdx: number) => void
  /**
   * `auto` marca el cierre automático: guarda sin abrir el resumen.
   * `incluirCargadas` guarda también las series con datos escritos en este
   * entreno que quedaron sin tildar (ver `seriesCargadas`).
   */
  finishWorkout: (options?: { auto?: boolean; incluirCargadas?: boolean }) => void
  /**
   * Cierra el entreno del día si quedó abierto más de 4 horas. Devuelve true si
   * hizo algo. Se llama al abrir la app, al volver del segundo plano y cada
   * minuto mientras está abierta.
   */
  autoCloseStaleWorkout: () => boolean
  cancelWorkout: () => void
  dismissRestTimer: () => void
  adjustRestTimer: (delta: number) => void
  setRestPreset: (seconds: number) => void
  dismissLivePr: () => void
  /** Cierra el resumen y navega adonde dice el botón que se tocó. */
  dismissSummary: (destino?: import('../types').NavTab) => void
}

// Duración con la que se guarda un entreno que se cerró solo: no se sabe
// cuándo terminó de verdad, y 2 h es una sesión larga pero realista.
const MAX_WORKOUT_DURATION_MIN = 120

/**
 * A las 4 horas el entreno se cierra solo: si la app quedó abierta (o el
 * teléfono se guardó en el bolso), la sesión del día se guarda con la duración
 * capeada en vez de quedar viva para siempre y arrastrarse al día siguiente.
 */
const AUTO_CLOSE_AFTER_MIN = 240

const DESCANSO_INICIAL = 75

/**
 * Cuánto descansar después de una serie de este ejercicio: lo elegido a mano en
 * este entreno, si no lo que pide la nota de la rutina ("descanso 2 min"), y si
 * no el descanso por defecto.
 */
export function descansoPara(aw: ActiveWorkout, exerciseId: string): number {
  const elegido = aw.restPorEjercicio?.[exerciseId]
  if (elegido) return elegido
  const routine = useStore.getState().routines.find((r) => r.id === aw.routineId)
  const nota = descansoDeNota(routine?.exercises.find((re) => re.exerciseId === exerciseId)?.note)
  return nota ?? aw.restDefaultSeconds ?? DESCANSO_INICIAL
}

/** La serie tiene lo mínimo para guardarse: reps, o tiempo en los ejercicios por tiempo. */
function serieConDatos(s: ActiveWorkoutSet, porTiempo: boolean): boolean {
  return porTiempo ? (parseDecimal(s.duration ?? '') || 0) > 0 : (parseInt(s.reps) || 0) > 0
}

/**
 * Series sin tildar en las que se escribió algo durante el entreno: lo típico
 * es cargar el peso y las reps de la última serie y olvidarse del tilde.
 * Lo prellenado de la vez anterior no cuenta.
 */
export function seriesCargadas(aw: ActiveWorkout, exercises: Exercise[]): Array<{ exIdx: number; setIdx: number }> {
  const out: Array<{ exIdx: number; setIdx: number }> = []
  aw.exercises.forEach((ex, exIdx) => {
    const porTiempo = isDurationExercise(exercises.find((e) => e.id === ex.exerciseId))
    ex.sets.forEach((s, setIdx) => {
      if (!s.completed && s.editada && serieConDatos(s, porTiempo)) out.push({ exIdx, setIdx })
    })
  })
  return out
}

function clampValue(field: 'kg' | 'reps' | 'duration', value: string): string {
  if (value === '') return ''
  if (field === 'reps') {
    const digits = normalizeIntegerInput(value)
    if (digits === '') return ''
    return String(Math.min(100, Math.max(0, parseInt(digits, 10))))
  }
  // kg y duration aceptan decimales escritos con coma o con punto. El tope alto
  // de duration cubre minutos (cinta) y segundos (planchas): la unidad la
  // resuelve la pantalla.
  return clampDecimalInput(value, field === 'kg' ? 500 : 600)
}


/**
 * Arma las series iniciales de un ejercicio dentro de un entreno.
 *
 * Se usa al arrancar la rutina y también al agregar o cambiar un ejercicio en
 * el medio del entreno, para que en los dos casos se prellene igual: el peso
 * máximo y las reps de la última vez que se hizo.
 */
function buildActiveExercise(
  exerciseId: string,
  routineId: string,
  setsOverride?: number,
): ActiveWorkoutExercise {
  const { routines, workouts, exercises: exerciseDb, customExercises } = useStore.getState()
  const allExercises = [...exerciseDb, ...customExercises]
  const exercise = allExercises.find((e) => e.id === exerciseId)
  // Con las series y reps del bloque elegido (semanas 1-3 o 4-6).
  const guardada = routines.find((r) => r.id === routineId)
  const routine = guardada ? rutinaEnUso(guardada) : undefined
  const routineEx = routine?.exercises.find((re) => re.exerciseId === exerciseId)

  const finishedWorkouts = [...workouts]
    .filter((w) => w.finishedAt)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))

  // Se prioriza la misma rutina, pero si el ejercicio se hizo en otra (o la
  // rutina se editó) igual se traen esos valores en vez de dejar el campo vacío.
  const sameRoutine = finishedWorkouts.find((w) =>
    w.routineId === routineId && w.exercises.some((e) => e.exerciseId === exerciseId && e.sets.length > 0)
  )
  const source = sameRoutine ?? finishedWorkouts.find((w) =>
    w.exercises.some((e) => e.exerciseId === exerciseId && e.sets.length > 0)
  )
  const sets = source?.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? []
  // El calentamiento no sirve como referencia salvo que sea lo único.
  const working = sets.filter((s) => !s.isWarmup)
  const prevSets = working.length > 0 ? working : sets

  // Cuántas series: lo que dice la rutina, lo que se pidió, o lo de la última vez.
  const cantidad = setsOverride ?? routineEx?.sets ?? Math.max(1, prevSets.length || 3)

  if (isDurationExercise(exercise)) {
    const unit = durationUnit(exercise)
    const target = routineEx?.targetSeconds ?? prevSets[0]?.durationSec ?? 0
    return {
      exerciseId,
      sets: Array.from({ length: cantidad }, (_, i) => ({
        kg: '',
        reps: '',
        duration: fromSeconds(prevSets[i]?.durationSec ?? prevSets[prevSets.length - 1]?.durationSec ?? target, unit),
        completed: false,
      })),
    }
  }

  // Se prellena el peso máximo de la última vez, no el sugerido: subirlo es
  // decisión del usuario (la sugerencia queda a un toque, arriba del ejercicio).
  const topKg = lastTopKg(exerciseId, workouts)
  const maxKg = topKg != null ? String(topKg) : ''
  const lastPrevSet = prevSets[prevSets.length - 1]
  return {
    exerciseId,
    sets: Array.from({ length: cantidad }, (_, i) => {
      const prev = prevSets[i] ?? lastPrevSet
      const prevKg = prev && prev.kg > 0 ? String(prev.kg) : ''
      const prevReps = prev && prev.reps > 0 ? String(prev.reps) : ''
      return { kg: maxKg || prevKg, reps: prevReps, completed: false }
    }),
  }
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      summaryWorkout: null,
      summaryPrCount: 0,

      startWorkout: (routineId, dateOverride) => {
        // Que las series sean las de la semana del plan en curso (4-6 o 1-3).
        useStore.getState().sincronizarPrograma()
        const { routines } = useStore.getState()
        const routine = routines.find((r) => r.id === routineId)
        if (!routine) return

        const activeExercises: ActiveWorkoutExercise[] = routine.exercises.map((re) =>
          buildActiveExercise(re.exerciseId, routineId)
        )

        const now = Date.now()
        set({
          activeWorkout: {
            routineId,
            startedAt: dateOverride ?? now,
            realStartedAt: now,
            origen: dateOverride != null ? 'manual' : 'en-vivo',
            exercises: activeExercises,
            restTimerVisible: false,
            restSecondsLeft: DESCANSO_INICIAL,
            restTotalSeconds: DESCANSO_INICIAL,
            restDefaultSeconds: DESCANSO_INICIAL,
            restEndsAt: undefined,
          },
        })
      },

      setWorkoutDate: (timestamp) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          // Se conserva la hora original: sólo se mueve el día al que se imputa.
          const previous = new Date(s.activeWorkout.startedAt)
          const target = new Date(timestamp)
          const startedAt = new Date(
            target.getFullYear(), target.getMonth(), target.getDate(),
            previous.getHours(), previous.getMinutes(), previous.getSeconds(),
          ).getTime()
          // Pasarlo a otro día es cargarlo después: la hora y la duración no son las de ese día.
          const real = new Date(s.activeWorkout.realStartedAt)
          const mismoDia = target.getFullYear() === real.getFullYear() && target.getMonth() === real.getMonth() && target.getDate() === real.getDate()
          return { activeWorkout: { ...s.activeWorkout, startedAt, origen: mismoDia ? 'en-vivo' : 'manual' } }
        }),

      updateSetValue: (exerciseIdx, setIdx, field, value) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const clamped = clampValue(field, value)
          const exercises = s.activeWorkout.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            return {
              ...ex,
              sets: ex.sets.map((st, si) => (si === setIdx ? { ...st, [field]: clamped, editada: true } : st)),
            }
          })
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      toggleSetWarmup: (exerciseIdx, setIdx) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const exercises = s.activeWorkout.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            return {
              ...ex,
              sets: ex.sets.map((st, si) => (si === setIdx ? { ...st, isWarmup: !st.isWarmup } : st)),
            }
          })
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      completeSet: (exerciseIdx, setIdx, options) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const targetSet = s.activeWorkout.exercises[exerciseIdx]?.sets[setIdx]
          if (!targetSet) return {}
          if (!targetSet.completed) {
            const { exercises: exDb, customExercises: customEx } = useStore.getState()
            const exercise = [...exDb, ...customEx].find(
              (e) => e.id === s.activeWorkout?.exercises[exerciseIdx]?.exerciseId
            )
            if (isDurationExercise(exercise)) {
              const seconds = toSeconds(targetSet.duration ?? '', durationUnit(exercise))
              if (seconds <= 0) {
                useStore.getState().addToast(
                  durationUnit(exercise) === 'min'
                    ? 'Ingresá los minutos antes de completar'
                    : 'Ingresá los segundos antes de completar',
                  'info'
                )
                return {}
              }
            } else {
              const reps = parseInt(targetSet.reps)
              if (isNaN(reps) || reps <= 0) {
                useStore.getState().addToast('Ingresá la cantidad de reps antes de completar', 'info')
                return {}
              }
              // El peso es opcional: abdominales, dominadas o cualquier
              // ejercicio a peso corporal se registran sólo con reps.
            }
          }
          const exercises = s.activeWorkout.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            return {
              ...ex,
              sets: ex.sets.map((st, si) => (si === setIdx
                ? { ...st, completed: !st.completed, completedAt: st.completed ? undefined : Date.now() }
                : st)),
            }
          })
          const completedSet = exercises[exerciseIdx].sets[setIdx]
          const startRest = completedSet.completed && options?.startRest === true
          const lastCompletedSet = completedSet.completed
            ? {
                exerciseId: exercises[exerciseIdx].exerciseId,
                setIdx,
                kg: parseDecimal(completedSet.kg) || 0,
                reps: parseInt(completedSet.reps) || 0,
              }
            : s.activeWorkout.lastCompletedSet

          // Detect live PR (warm-up sets never count as PRs)
          let livePr = s.activeWorkout.livePr
          if (completedSet.completed && !completedSet.isWarmup) {
            const { prs } = useStore.getState()
            const exerciseId = exercises[exerciseIdx].exerciseId
            const kg = parseDecimal(completedSet.kg) || 0
            const reps = parseInt(completedSet.reps) || 0
            if (kg > 0) {
              const existing = prs.find((p) => p.exerciseId === exerciseId)
              const isPr = !existing || kg > existing.kg || (kg === existing.kg && reps > existing.reps)
              livePr = isPr ? { exerciseId, kg, reps } : null
            }
          } else {
            livePr = null
          }

          // El descanso de este ejercicio (la nota de la rutina, o lo elegido a mano).
          const descanso = startRest ? descansoPara(s.activeWorkout, exercises[exerciseIdx].exerciseId) : s.activeWorkout.restTotalSeconds
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises,
              lastCompletedSet,
              livePr,
              // El descanso arranca sólo si se confirmó con el ✓⏱. Confirmar con
              // un toque no corta el que ya estaba corriendo (en una superserie,
              // tildar B mataba el descanso de A).
              restTimerVisible: startRest || s.activeWorkout.restTimerVisible,
              restSecondsLeft: startRest ? descanso : s.activeWorkout.restSecondsLeft,
              restTotalSeconds: startRest ? descanso : s.activeWorkout.restTotalSeconds,
              restEndsAt: startRest
                ? Date.now() + descanso * 1000
                : s.activeWorkout.restEndsAt,
            },
          }
        }),

      addSetToExercise: (exerciseIdx) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const exercises = s.activeWorkout.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            const lastWithValues = [...ex.sets].reverse().find((st) => st.kg !== '' || st.reps !== '' || !!st.duration)
            const template = lastWithValues ?? ex.sets[ex.sets.length - 1]
            return {
              ...ex,
              sets: [...ex.sets, {
                kg: template?.kg ?? '',
                reps: template?.reps ?? '',
                // Los ejercicios por tiempo (plancha, cinta) también copian la duración.
                ...(template?.duration !== undefined ? { duration: template.duration } : {}),
                completed: false,
              }],
            }
          })
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      /**
       * Series iniciales de un ejercicio que se suma al entreno en curso: se
       * prellenan igual que al arrancar, con lo que se hizo la última vez.
       */
      addExerciseToWorkout: (exerciseId, afterIdx) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          if (s.activeWorkout.exercises.some((e) => e.exerciseId === exerciseId)) {
            useStore.getState().addToast('Ese ejercicio ya está en el entreno', 'info')
            return {}
          }
          const nuevo = buildActiveExercise(exerciseId, s.activeWorkout.routineId)
          const exercises = [...s.activeWorkout.exercises]
          const pos = afterIdx === undefined ? exercises.length : afterIdx + 1
          exercises.splice(pos, 0, nuevo)
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      replaceExerciseInWorkout: (exerciseIdx, exerciseId) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const actual = s.activeWorkout.exercises[exerciseIdx]
          if (!actual) return {}
          if (s.activeWorkout.exercises.some((e, i) => i !== exerciseIdx && e.exerciseId === exerciseId)) {
            useStore.getState().addToast('Ese ejercicio ya está en el entreno', 'info')
            return {}
          }
          const hechas = actual.sets.filter((st) => st.completed)
          // Las series que faltaban pasan al nuevo; las que ya se hicieron se
          // quedan con el ejercicio original, que sigue en el entreno.
          const faltantes = actual.sets.length - hechas.length
          const nuevo = buildActiveExercise(exerciseId, s.activeWorkout.routineId, Math.max(1, faltantes))
          const exercises = hechas.length > 0
            ? s.activeWorkout.exercises.flatMap((e, i) => (i === exerciseIdx ? [{ ...e, sets: hechas }, nuevo] : [e]))
            : s.activeWorkout.exercises.map((e, i) => (i === exerciseIdx ? nuevo : e))
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      removeExerciseFromWorkout: (exerciseIdx) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          if (s.activeWorkout.exercises.length <= 1) {
            useStore.getState().addToast('Es el único ejercicio del entreno', 'info')
            return {}
          }
          const exercises = s.activeWorkout.exercises.filter((_, i) => i !== exerciseIdx)
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      removeSetFromExercise: (exerciseIdx, setIdx) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const exercises = s.activeWorkout.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            if (ex.sets.length <= 1) return ex
            return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
          })
          return { activeWorkout: { ...s.activeWorkout, exercises } }
        }),

      autoCloseStaleWorkout: () => {
        const { activeWorkout } = get()
        if (!activeWorkout) return false
        const openMin = (Date.now() - activeWorkout.realStartedAt) / 60000
        if (openMin < AUTO_CLOSE_AFTER_MIN) return false

        const tieneSeries = activeWorkout.exercises.some((ex) => ex.sets.some((s) => s.completed))
        if (tieneSeries) {
          // Se guarda con la duración capeada (MAX_WORKOUT_DURATION_MIN).
          get().finishWorkout({ auto: true })
        } else {
          // Sin series completadas no hay nada que guardar: se descarta.
          set({ activeWorkout: null })
          useStore.getState().addToast('Se cerró un entreno que quedó abierto sin series', 'info')
        }
        return true
      },

      finishWorkout: (options) => {
        const { activeWorkout: enCurso } = get()
        if (!enCurso) return

        const { prs, exercises: allExDb, customExercises } = useStore.getState()
        const allExercises = [...allExDb, ...customExercises]

        // "Guardar también esas": las series cargadas cuentan como hechas.
        const cargadas = options?.incluirCargadas ? seriesCargadas(enCurso, allExercises) : []
        const activeWorkout: ActiveWorkout = cargadas.length === 0 ? enCurso : {
          ...enCurso,
          exercises: enCurso.exercises.map((ex, exIdx) => ({
            ...ex,
            sets: ex.sets.map((st, setIdx) => (cargadas.some((c) => c.exIdx === exIdx && c.setIdx === setIdx) ? { ...st, completed: true } : st)),
          })),
        }

        const hasWorkingSets = activeWorkout.exercises.some(ex =>
          ex.sets.some(s => s.completed)
        )
        if (!hasWorkingSets) {
          useStore.getState().addToast('Completá al menos una serie antes de terminar', 'info')
          return
        }

        const realFinishedAt = Date.now()
        const rawDurationMin = Math.round((realFinishedAt - activeWorkout.realStartedAt) / 60000)
        // El cierre automático (la app quedó abierta en el bolso) guarda una
        // duración realista. Terminado a mano se respeta lo que duró: un
        // entreno de 3 h 10 con una amiga se guardaba como 2 h.
        const durationMin = options?.auto
          ? MAX_WORKOUT_DURATION_MIN
          : Math.min(rawDurationMin, AUTO_CLOSE_AFTER_MIN)
        // Use startedAt (which respects dateOverride) plus the (possibly capped)
        // duration so that backdated workouts land on the correct date instead of today.
        const finishedAt = activeWorkout.startedAt + durationMin * 60000

        const workoutExercises = activeWorkout.exercises.map((ex) => {
          const exercise = allExercises.find((e) => e.id === ex.exerciseId)
          const unit = durationUnit(exercise)
          return {
            exerciseId: ex.exerciseId,
            sets: ex.sets
              .filter((s) => s.completed)
              .map((s) => ({
                kg: parseDecimal(s.kg) || 0,
                reps: parseInt(s.reps) || 0,
                // La hora real de la serie, corrida al día al que se imputa el
                // entreno (puede ser el de ayer). Las viejas no la tenían.
                completedAt: s.completedAt
                  ? Math.min(finishedAt, activeWorkout.startedAt + Math.max(0, s.completedAt - activeWorkout.realStartedAt))
                  : finishedAt,
                isWarmup: s.isWarmup || undefined,
                durationSec: isDurationExercise(exercise)
                  ? toSeconds(s.duration ?? '', unit)
                  : undefined,
              })),
          }
        })

        // Con qué semana del plan y con qué series se hizo: el informe de un
        // ciclo pasado no se puede reconstruir después si no se guarda ahora.
        const { programa, routines } = useStore.getState()
        const rutina = routines.find((r) => r.id === activeWorkout.routineId)
        const semanaPrograma = semanaDeEntreno(programa, activeWorkout.startedAt) ?? undefined
        const origen: WorkoutOrigen = options?.auto ? 'auto' : activeWorkout.origen ?? 'en-vivo'

        const newWorkout: Workout = {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `workout-${crypto.randomUUID()}` : `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          routineId: activeWorkout.routineId,
          startedAt: activeWorkout.startedAt,
          finishedAt,
          durationMin,
          exercises: workoutExercises,
          origen,
          ...(semanaPrograma ? { semanaPrograma } : {}),
          ...(rutina && tieneVariante(rutina) ? { variante: rutina.variante ?? 'base' } : {}),
        }

        // Los récords se derivan del historial completo, con el entreno recién
        // terminado incluido: así una serie corregida o un entreno borrado
        // nunca dejan una marca huérfana.
        const workoutsConEste = [...useStore.getState().workouts, newWorkout]
        const newPrs = computeRecords(workoutsConEste, allExercises)
        const newPrCount = newRecords(prs, newPrs).length

        const seriesTotales = workoutExercises.reduce((a, e) => a + e.sets.length, 0)
        // Lo que se hizo y lo que toca subir ya lo muestra el resumen ("La próxima
        // subís"): repetirlo en avisos sólo tapaba la pantalla. En el cierre
        // automático, en cambio, no hay resumen y el aviso es la única señal.
        const avisos: AppToast[] = options?.auto
          ? [{
              id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              message: `El entreno quedó abierto más de 4 h: lo guardamos con ${durationMin} min · ${seriesTotales} series`,
              type: 'info',
            }]
          : []

        // Write finished workout + PRs + toasts to persisted store
        useStore.setState((s) => ({
          workouts: [...s.workouts, newWorkout],
          prs: newPrs,
          toasts: [...s.toasts, ...avisos].slice(-3),
        }))

        // Se cierra en el mismo paso que se abre el resumen. Si el teléfono se
        // quedó sin espacio el entreno igual queda en memoria (y el aviso pide
        // exportar un backup): dejarlo abierto hacía que cada "Terminar" lo
        // volviera a agregar.
        set({
          // En el cierre automático no abrimos el resumen: el usuario no está
          // mirando y se lo encontraría de golpe al día siguiente.
          summaryWorkout: options?.auto ? null : newWorkout,
          summaryPrCount: options?.auto ? 0 : newPrCount,
          activeWorkout: null,
        })
        if (huboFalloDeEscritura()) {
          useStore.getState().addToast('El entreno no se pudo guardar en el teléfono (sin espacio): exportá un backup ahora', 'info')
        }
      },

      cancelWorkout: () => set({ activeWorkout: null }),

      dismissRestTimer: () =>
        set((s) => {
          if (!s.activeWorkout) return {}
          return { activeWorkout: { ...s.activeWorkout, restTimerVisible: false } }
        }),

      adjustRestTimer: (delta) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          const newSeconds = Math.max(0, s.activeWorkout.restSecondsLeft + delta)
          // Bajarlo a cero es terminar el descanso: si no, quedaba clavado en
          // 0:00 sin sonar, porque el tick sólo avisa al cruzar el cero.
          if (newSeconds <= 0) {
            return { activeWorkout: { ...s.activeWorkout, restTimerVisible: false, restSecondsLeft: 0, restEndsAt: undefined } }
          }
          return {
            activeWorkout: {
              ...s.activeWorkout,
              restSecondsLeft: newSeconds,
              restTotalSeconds: Math.max(s.activeWorkout.restTotalSeconds, newSeconds),
              restEndsAt: Date.now() + newSeconds * 1000,
            },
          }
        }),

      setRestPreset: (seconds) =>
        set((s) => {
          if (!s.activeWorkout) return {}
          // Lo elegido vale para este ejercicio el resto del entreno, y pasa a ser
          // el descanso de los ejercicios cuya nota no dice nada.
          const exId = s.activeWorkout.lastCompletedSet?.exerciseId
          return {
            activeWorkout: {
              ...s.activeWorkout,
              restDefaultSeconds: seconds,
              restPorEjercicio: exId ? { ...s.activeWorkout.restPorEjercicio, [exId]: seconds } : s.activeWorkout.restPorEjercicio,
              restSecondsLeft: seconds,
              restTotalSeconds: seconds,
              restEndsAt: Date.now() + seconds * 1000,
            },
          }
        }),

      dismissLivePr: () =>
        set((s) => {
          if (!s.activeWorkout) return {}
          return { activeWorkout: { ...s.activeWorkout, livePr: null } }
        }),

      dismissSummary: (destino = 'home') => {
        useStore.setState({ activeTab: destino })
        set({ summaryWorkout: null, summaryPrCount: 0 })
      },
    }),
    {
      name: 'gympro-active-workout',
      storage: createSafeStorage<{ activeWorkout: ActiveWorkout | null }>(),
      // El segundero del descanso no se guarda: sale de restEndsAt. Guardarlo
      // era escribir el entreno entero en el teléfono una vez por segundo.
      partialize: (s) => ({
        activeWorkout: s.activeWorkout ? { ...s.activeWorkout, restSecondsLeft: 0 } : null,
      }),
      merge: (persisted, current) => {
        const aw = (persisted as { activeWorkout?: ActiveWorkout | null } | undefined)?.activeWorkout ?? null
        if (!aw) return { ...current, activeWorkout: null }
        const left = aw.restEndsAt ? Math.max(0, Math.ceil((aw.restEndsAt - Date.now()) / 1000)) : aw.restTotalSeconds
        return { ...current, activeWorkout: { ...aw, restSecondsLeft: left } }
      },
    }
  )
)
