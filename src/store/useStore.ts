import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import type { Exercise, Routine, Workout, PR, NavTab, CalendarSubTab, ExerciseTips, AppToast, MuscleGroup, BodyMeasure } from '../types'
import { exercises as exerciseDb } from '../data/exercises'
import { buildCustomExercise, draftFromName, inferEquipmentType } from '../utils/exerciseMatch'
import { muscleGroupConfig } from '../data/muscleGroups'
import { seedRoutines, seedWorkouts } from '../data/seedData'
import { buildMileRoutines, completarPlanMile, MILE_WEEK_PLAN } from '../data/mileRoutines'
import { computeRecords } from '../utils/records'
import { conColores } from '../utils/trainingDays'
import { tieneVariante } from '../utils/routineVariant'
import type { WeekOverrides } from '../utils/weekPlan'
import { faseDeSemana, inicioParaSemana, semanaDelPrograma, SEMANAS_PROGRAMA, type ProgramaEstado } from '../utils/program'
import { alFallarEscritura, createSafeStorage } from '../utils/safeStorage'

interface AppState {
  // Navigation
  activeTab: NavTab
  calendarSubTab: CalendarSubTab
  activeRoutineId: string | null
  showExercisePicker: boolean

  // Data
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  prs: PR[]
  exerciseTips: ExerciseTips
  userName: string
  seeded: boolean
  onboarded: boolean
  anthropicApiKey: string
  toasts: AppToast[]
  /** La semana por defecto: rige en toda semana que no tenga plan propio. */
  weekPlan: Record<number, string | null>
  /** Plan propio de algunas semanas, por la clave (dayKey) de su lunes. */
  weekOverrides: WeekOverrides
  /** Entrenos por semana que se propone el usuario. null = los que pide la semana tipo. */
  weeklyGoal: number | null
  /** Peso corporal y circunferencias, de la medición más vieja a la más nueva. */
  measures: BodyMeasure[]
  /** Última vez que se exportó un backup, para poder recordarlo. */
  lastBackupAt: number | null
  customExercises: Exercise[]
  /** Foto de perfil, achicada y guardada como data URL en el teléfono. */
  avatarPhoto: string | null
  setAvatarPhoto: (photo: string | null) => void
  archivedRoutineNames: Record<string, { name: string; emoji: string }>
  /** Plan por semanas (el de Mile). null = todavía no se dijo en qué semana estás. */
  programa: ProgramaEstado | null
  /** Hoy estás en la semana `semana` del plan: fija el inicio y aplica el bloque que corresponde. */
  fijarSemanaPrograma: (semana: number) => void
  /** Pasa las rutinas a Semanas 4-6 (o vuelve a 1-3) cuando el plan cambia de bloque. */
  sincronizarPrograma: () => void
  /** Después de la semana 6: no volver a preguntar. Las rutinas vuelven a Semanas 1-3. */
  terminarPrograma: () => void
  /** Vuelve a preguntar en qué semana del plan estás (después de haberlo terminado). */
  retomarPrograma: () => void
  /** Las rutinas de Mile ya se completaron con bloques y semanas 4-6: no se vuelve a hacer. */
  planMileCompletado: boolean
  /** Lunes (dayKey) de la semana cuyo repaso ya se cerró en Inicio. */
  repasoCerrado: string | null
  cerrarRepaso: (lunesKey: string) => void

  // Actions
  setActiveTab: (tab: NavTab) => void
  setCalendarSubTab: (tab: CalendarSubTab) => void
  setActiveRoutineId: (id: string | null) => void
  setShowExercisePicker: (show: boolean) => void
  /** Día que la Agenda tiene que abrir al entrar (desde "Última sesión" en Inicio). */
  agendaDayTs: number | null
  openAgendaDay: (ts: number) => void
  clearAgendaDay: () => void

  // Routines
  addRoutine: (routine: Routine) => void
  updateRoutine: (routine: Routine) => void
  deleteRoutine: (id: string) => void
  addExerciseToRoutine: (routineId: string, exerciseId: string) => void
  removeExerciseFromRoutine: (routineId: string, exerciseId: string) => void
  reorderRoutineExercises: (routineId: string, exercises: Routine['exercises']) => void

  // Workout history
  deleteWorkout: (id: string) => void
  /** Vuelve a poner un entreno borrado (el botón "Deshacer" del aviso). */
  restoreWorkout: (workout: Workout) => void
  updateWorkout: (workout: Workout) => void
  /** Vuelve a derivar todos los récords del historial. */
  recomputeRecords: () => void

  // Tips
  setExerciseTip: (exerciseId: string, tip: string) => void

  // Profile
  updateUserName: (name: string) => void
  setOnboarded: () => void
  setAnthropicApiKey: (key: string) => void

  // Toasts
  addToast: (message: string, type: AppToast['type']) => void
  /** Aviso con botón de deshacer: para borrados que no necesitan confirmación previa. */
  addUndoToast: (message: string, undo: () => void) => void
  removeToast: (id: string) => void

  // Week plan
  setWeekPlanDay: (dow: number, routineId: string | null) => void
  /** Cambia un día de una semana puntual; la primera vez parte de la semana por defecto. */
  setWeekOverrideDay: (lunesKey: string, dow: number, routineId: string | null) => void
  /** Esa semana vuelve a seguir la semana por defecto. */
  clearWeekOverride: (lunesKey: string) => void
  setWeeklyGoal: (goal: number | null) => void

  // Medidas
  addMeasure: (measure: Omit<BodyMeasure, 'id'>) => void
  updateMeasure: (measure: BodyMeasure) => void
  deleteMeasure: (id: string) => void

  /** Marca que se acaba de exportar un backup. */
  markBackupDone: () => void

  // Custom exercises
  addCustomExercise: (ex: Exercise) => void
  /** Crea un ejercicio propio a partir del nombre y devuelve el ejercicio creado. */
  createCustomExercise: (name: string, opts?: { group?: MuscleGroup; equipment?: string }) => Exercise | null
  /** Edita un ejercicio propio ya creado (el historial no se toca: el id no cambia). */
  updateCustomExercise: (id: string, patch: { nameEs: string; group: MuscleGroup; equipment: string }) => void
  /**
   * Archiva un ejercicio propio: deja de aparecer para elegir, pero el
   * historial, los récords y Progreso lo siguen mostrando.
   */
  deleteCustomExercise: (id: string) => void
  /** Deshace el borrado de un ejercicio propio (y lo vuelve a poner en las rutinas de donde salió). */
  restoreCustomExercise: (exercise: Exercise, routines: Routine[]) => void

  // Archived routines (for history display after deletion)
  getArchivedRoutineName: (routineId: string) => { name: string; emoji: string } | null

  /** Carga (o repone) las tres rutinas del plan de Mile. Devuelve cuántas agregó. */
  installMileRoutines: () => number

  // Seed
  seedData: () => void
}

export const STORAGE_KEY = 'gympro-storage-v2'
/**
 * Versión del formato guardado. Sube cuando cambia la forma de los datos, y
 * `migrarEstado` lleva lo viejo a lo nuevo (también al importar un backup).
 */
export const STORAGE_VERSION = 1

function partialize(state: AppState) {
  return {
    routines: state.routines,
    workouts: state.workouts,
    prs: state.prs,
    exerciseTips: state.exerciseTips,
    userName: state.userName,
    seeded: state.seeded,
    onboarded: state.onboarded,
    anthropicApiKey: state.anthropicApiKey,
    weekPlan: state.weekPlan,
    weekOverrides: state.weekOverrides,
    weeklyGoal: state.weeklyGoal,
    measures: state.measures,
    lastBackupAt: state.lastBackupAt,
    customExercises: state.customExercises,
    avatarPhoto: state.avatarPhoto,
    archivedRoutineNames: state.archivedRoutineNames,
    programa: state.programa,
    repasoCerrado: state.repasoCerrado,
    planMileCompletado: state.planMileCompletado,
  }
}

export type PersistedState = ReturnType<typeof partialize>

/** La semana tipo de Mile que se guardó entre fines de agosto y principios de octubre: martes, jueves y sábado. */
const MILE_WEEK_PLAN_VIEJO: Record<string, string> = { 1: 'mile-piernas', 3: 'mile-brazos', 5: 'mile-fullbody' }

/**
 * Lleva un estado guardado por una versión anterior al formato actual.
 * Exportada para probarla y para el import de backups.
 */
export function migrarEstado(persisted: unknown, version: number): Record<string, unknown> {
  const state = { ...((persisted ?? {}) as Record<string, unknown>) }
  if (version < 1) {
    // El peso corporal de junio y julio de 2026 (bodyWeights) pasa a medidas.
    const viejos = state.bodyWeights
    if (Array.isArray(viejos) && viejos.length) {
      const medidas = Array.isArray(state.measures) ? [...(state.measures as BodyMeasure[])] : []
      const fechas = new Set(medidas.map((m) => m.date))
      viejos.forEach((b: { date?: unknown; kg?: unknown }, i) => {
        if (typeof b?.date !== 'number' || typeof b?.kg !== 'number' || fechas.has(b.date)) return
        medidas.push({ id: `medida-migrada-${b.date}-${i}`, date: b.date, weightKg: b.kg })
      })
      state.measures = medidas.sort((a, b) => a.date - b.date)
    }
    delete state.bodyWeights
    // Cada rutina se queda con el color que tenía (el de su posición).
    if (Array.isArray(state.routines)) state.routines = conColores(state.routines as Routine[])
    // La semana tipo de Mile con las claves corridas (martes, jueves, sábado).
    const plan = state.weekPlan as Record<string, string | null> | undefined
    if (plan) {
      const conRutina = Object.entries(plan).filter(([, id]) => id)
      const esElViejo = conRutina.length === 3 && conRutina.every(([dow, id]) => MILE_WEEK_PLAN_VIEJO[dow] === id)
      if (esElViejo) state.weekPlan = { ...MILE_WEEK_PLAN }
    }
  }
  return state
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      calendarSubTab: 'calendario',
      activeRoutineId: null,
      showExercisePicker: false,
      agendaDayTs: null,
      exercises: exerciseDb,
      routines: [],
      workouts: [],
      prs: [],
      exerciseTips: {},
      userName: 'Atleta',
      seeded: false,
      onboarded: false,
      anthropicApiKey: '',
      toasts: [],
      weekPlan: {},
      weekOverrides: {},
      weeklyGoal: null,
      measures: [],
      lastBackupAt: null,
      customExercises: [],
      avatarPhoto: null,
      archivedRoutineNames: {},
      programa: null,
      repasoCerrado: null,
      planMileCompletado: false,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setCalendarSubTab: (tab) => set({ calendarSubTab: tab }),
      setActiveRoutineId: (id) => set({ activeRoutineId: id }),
      setShowExercisePicker: (show) => set({ showExercisePicker: show }),
      openAgendaDay: (ts) => set({ activeTab: 'calendario', calendarSubTab: 'calendario', activeRoutineId: null, agendaDayTs: ts }),
      clearAgendaDay: () => set({ agendaDayTs: null }),
      setAvatarPhoto: (photo) => set({ avatarPhoto: photo }),

      addRoutine: (routine) => set((s) => ({ routines: conColores([...s.routines, routine]) })),
      updateRoutine: (routine) =>
        set((s) => ({ routines: s.routines.map((r) => (r.id === routine.id ? routine : r)) })),
      deleteRoutine: (id) => set((s) => {
        const routine = s.routines.find((r) => r.id === id)
        const archived = routine
          ? { ...s.archivedRoutineNames, [id]: { name: routine.name, emoji: routine.emoji } }
          : s.archivedRoutineNames
        // Si no se limpia acá, el día queda "planificado" contra una rutina que
        // ya no existe: el select la muestra como Descanso pero sigue contando
        // en el cumplimiento del plan.
        const weekPlan = Object.fromEntries(
          Object.entries(s.weekPlan).map(([dow, routineId]) => [dow, routineId === id ? null : routineId])
        )
        const weekOverrides = Object.fromEntries(
          Object.entries(s.weekOverrides).map(([lunes, plan]) => [
            lunes,
            Object.fromEntries(Object.entries(plan).map(([dow, routineId]) => [dow, routineId === id ? null : routineId])),
          ])
        )
        return {
          routines: s.routines.filter((r) => r.id !== id),
          activeRoutineId: s.activeRoutineId === id ? null : s.activeRoutineId,
          archivedRoutineNames: archived,
          weekPlan,
          weekOverrides,
        }
      }),

      addExerciseToRoutine: (routineId, exerciseId) =>
        set((s) => {
          const exercise = [...s.exercises, ...s.customExercises].find((e) => e.id === exerciseId)
          // Los ejercicios por tiempo arrancan con un objetivo razonable según
          // su unidad: 15 minutos de cardio, 30 segundos de isométrico.
          const byTime = exercise?.trackingType === 'duration'
          const defaults = byTime
            ? {
                sets: 1,
                repsMin: 8,
                repsMax: 12,
                targetSeconds: exercise?.durationUnit === 'seg' ? 30 : 15 * 60,
              }
            : { sets: 3, repsMin: 8, repsMax: 12 }
          return {
            routines: s.routines.map((r) => {
              if (r.id !== routineId) return r
              if (r.exercises.some((e) => e.exerciseId === exerciseId)) return r
              const maxOrder = r.exercises.reduce((max, e) => Math.max(max, e.order), -1)
              return {
                ...r,
                exercises: [...r.exercises, { exerciseId, ...defaults, order: maxOrder + 1 }],
              }
            }),
          }
        }),

      removeExerciseFromRoutine: (routineId, exerciseId) =>
        set((s) => ({
          routines: s.routines.map((r) => {
            if (r.id !== routineId) return r
            return { ...r, exercises: r.exercises.filter((e) => e.exerciseId !== exerciseId) }
          }),
        })),

      reorderRoutineExercises: (routineId, exercises) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === routineId ? { ...r, exercises } : r)),
        })),

      deleteWorkout: (id) => set((s) => {
        const workouts = s.workouts.filter((w) => w.id !== id)
        // Los récords se derivan del historial: si se va el entreno, se va su marca.
        return { workouts, prs: computeRecords(workouts, [...s.exercises, ...s.customExercises]) }
      }),

      restoreWorkout: (workout) =>
        set((s) => {
          if (s.workouts.some((w) => w.id === workout.id)) return {}
          const workouts = [...s.workouts, workout].sort((a, b) => a.startedAt - b.startedAt)
          return { workouts, prs: computeRecords(workouts, [...s.exercises, ...s.customExercises]) }
        }),

      updateWorkout: (workout) =>
        set((s) => {
          // Una fecha inválida escondía el entreno de todas las vistas para siempre.
          if (!Number.isFinite(workout.startedAt) || (workout.finishedAt !== undefined && !Number.isFinite(workout.finishedAt))) return {}
          const workouts = s.workouts.map((w) => (w.id === workout.id ? workout : w))
          return { workouts, prs: computeRecords(workouts, [...s.exercises, ...s.customExercises]) }
        }),

      recomputeRecords: () =>
        set((s) => ({ prs: computeRecords(s.workouts, [...s.exercises, ...s.customExercises]) })),

      setExerciseTip: (exerciseId, tip) =>
        set((s) => ({ exerciseTips: { ...s.exerciseTips, [exerciseId]: tip } })),

      updateUserName: (name) => set({ userName: name }),
      setOnboarded: () => set({ onboarded: true }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      addToast: (message, type) =>
        set((s) => ({
          // Se ven los últimos 3; los de más atrás no corrían su reloj y
          // reaparecían minutos después (un "Deshacer" fuera de contexto).
          toasts: [...s.toasts, { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type }].slice(-3),
        })),
      addUndoToast: (message, undo) =>
        set((s) => ({
          toasts: [
            ...s.toasts,
            { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type: 'info' as const, undo },
          ].slice(-3),
        })),

      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setWeekPlanDay: (dow, routineId) =>
        set((s) => ({ weekPlan: { ...s.weekPlan, [dow]: routineId } })),

      setWeekOverrideDay: (lunesKey, dow, routineId) =>
        set((s) => ({
          weekOverrides: {
            ...s.weekOverrides,
            [lunesKey]: { ...(s.weekOverrides[lunesKey] ?? s.weekPlan), [dow]: routineId },
          },
        })),

      clearWeekOverride: (lunesKey) =>
        set((s) => {
          const resto = { ...s.weekOverrides }
          delete resto[lunesKey]
          return { weekOverrides: resto }
        }),

      setWeeklyGoal: (goal) => set({ weeklyGoal: goal }),

      fijarSemanaPrograma: (semana) => {
        const nowTs = Date.now()
        const fase = faseDeSemana(semana)
        set((s) => ({
          programa: { inicio: inicioParaSemana(semana, nowTs), fase },
          routines: s.routines.map((r) => (tieneVariante(r) ? { ...r, variante: fase } : r)),
        }))
      },

      sincronizarPrograma: () => {
        const { programa, routines } = get()
        if (!programa || programa.terminado) return
        const semana = semanaDelPrograma(programa.inicio, Date.now())
        // Pasada la semana 6, Inicio pregunta si arrancás de nuevo; hasta entonces no se toca nada.
        if (semana > SEMANAS_PROGRAMA) return
        const fase = faseDeSemana(semana)
        if (fase === programa.fase) return
        set({
          programa: { ...programa, fase },
          routines: routines.map((r) => (tieneVariante(r) ? { ...r, variante: fase } : r)),
        })
        get().addToast(
          fase === 'alt' ? `Semana ${semana}: las rutinas pasaron a Semanas 4-6` : `Semana ${semana}: las rutinas volvieron a Semanas 1-3`,
          'info',
        )
      },

      terminarPrograma: () =>
        set((s) => (s.programa
          ? {
              programa: { ...s.programa, terminado: true, fase: 'base' },
              // Sin plan en curso, las rutinas vuelven a las series de base:
              // quedaban trabadas en Semanas 4-6.
              routines: s.routines.map((r) => (tieneVariante(r) ? { ...r, variante: 'base' } : r)),
            }
          : {})),

      retomarPrograma: () => set({ programa: null }),

      cerrarRepaso: (lunesKey) => set({ repasoCerrado: lunesKey }),

      addMeasure: (measure) =>
        set((s) => ({
          measures: [
            ...s.measures,
            { ...measure, id: `medida-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          ].sort((a, b) => a.date - b.date),
        })),

      updateMeasure: (measure) =>
        set((s) => ({
          measures: s.measures.map((m) => (m.id === measure.id ? measure : m)).sort((a, b) => a.date - b.date),
        })),

      deleteMeasure: (id) => set((s) => ({ measures: s.measures.filter((m) => m.id !== id) })),

      markBackupDone: () => set({ lastBackupAt: Date.now() }),

      addCustomExercise: (ex) =>
        set((s) => ({ customExercises: [...s.customExercises, ex] })),

      createCustomExercise: (name, opts) => {
        const trimmed = name.trim()
        if (!trimmed) return null
        // Si ya existe uno con ese nombre (base o propio) lo reutilizamos, para
        // no terminar con tres "Press de banca" distintos en el historial.
        const existing = [...get().exercises, ...get().customExercises].find(
          (e) => e.nameEs.trim().toLowerCase() === trimmed.toLowerCase()
        )
        if (existing?.archived) {
          // Uno que se había borrado vuelve con su historial.
          set((s) => ({
            customExercises: s.customExercises.map((e) => (e.id === existing.id ? { ...e, archived: undefined } : e)),
          }))
          return { ...existing, archived: undefined }
        }
        if (existing) return existing
        const ex = buildCustomExercise(trimmed, opts)
        set((s) => ({ customExercises: [...s.customExercises, ex] }))
        return ex
      },

      updateCustomExercise: (id, patch) =>
        set((s) => ({
          customExercises: s.customExercises.map((e) => {
            if (e.id !== id) return e
            const name = patch.nameEs.trim() || e.nameEs
            const equipment = patch.equipment.trim() || 'Libre'
            // El dibujo se recalcula con el nombre y el grupo nuevos.
            const draft = draftFromName(name, patch.group)
            return {
              ...e,
              nameEs: name,
              muscleGroup: patch.group,
              primaryMuscles: [muscleGroupConfig[patch.group].label],
              equipment,
              equipmentType: inferEquipmentType(equipment),
              frameSlug: draft.frameSlug ?? undefined,
            }
          }),
        })),

      deleteCustomExercise: (id) =>
        set((s) => ({
          // No se borra: se archiva. Los entrenos guardados lo siguen
          // nombrando, y sin la definición desaparecía de todo el historial.
          customExercises: s.customExercises.map((e) => (e.id === id ? { ...e, archived: true } : e)),
          routines: s.routines.map(r => ({
            ...r,
            exercises: r.exercises.filter(re => re.exerciseId !== id),
          })),
        })),

      restoreCustomExercise: (exercise, routines) =>
        set((s) => ({
          customExercises: s.customExercises.some((e) => e.id === exercise.id)
            ? s.customExercises.map((e) => (e.id === exercise.id ? { ...exercise, archived: undefined } : e))
            : [...s.customExercises, { ...exercise, archived: undefined }],
          routines: s.routines.map((r) => routines.find((x) => x.id === r.id) ?? r),
        })),

      getArchivedRoutineName: (routineId) => {
        const { archivedRoutineNames } = get()
        return archivedRoutineNames[routineId] ?? null
      },

      installMileRoutines: () => {
        const existing = new Set(get().routines.map((r) => r.id))
        const nuevas = buildMileRoutines().filter((r) => !existing.has(r.id))
        if (!nuevas.length) return 0
        set((s) => ({
          planMileCompletado: true,
          routines: conColores([...s.routines, ...nuevas]),
          // Si todavía no hay plan semanal armado, dejamos el sugerido.
          weekPlan: Object.values(s.weekPlan).some(Boolean) ? s.weekPlan : { ...s.weekPlan, ...MILE_WEEK_PLAN },
        }))
        return nuevas.length
      },

      seedData: () => {
        const { seeded } = get()
        if (seeded) return

        const prs: PR[] = [
          { exerciseId: 'pecho-01', kg: 85, reps: 6, date: Date.now() - 86400000 * 2 },
          { exerciseId: 'espalda-01', kg: 120, reps: 4, date: Date.now() - 86400000 * 4 },
          { exerciseId: 'piernas-01', kg: 105, reps: 5, date: Date.now() - 86400000 * 6 },
          { exerciseId: 'biceps-01', kg: 42, reps: 10, date: Date.now() - 86400000 * 4 },
          { exerciseId: 'hombros-01', kg: 62.5, reps: 7, date: Date.now() - 86400000 * 2 },
        ]

        set({
          // Las rutinas de Mile vienen prearmadas desde el primer arranque.
          routines: conColores([...buildMileRoutines(), ...seedRoutines]),
          workouts: seedWorkouts,
          prs,
          weekPlan: { ...MILE_WEEK_PLAN },
          seeded: true,
          planMileCompletado: true,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createSafeStorage<PersistedState>(),
      partialize,
      migrate: (persisted, version) => migrarEstado(persisted, version) as unknown as AppState,
      // Los récords guardados por versiones anteriores pueden haber quedado
      // huérfanos (entrenos borrados, pesos corregidos, marcas de ejercicios que
      // ya no existen). Se recalculan una sola vez al abrir la app para que
      // coincidan siempre con el historial.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // El set va en el próximo tick: durante la rehidratación el store
        // todavía se está armando y escribirle acá no persiste ni redibuja.
        queueMicrotask(() => {
          useStore.setState((s) => ({
            prs: computeRecords(s.workouts, [...s.exercises, ...s.customExercises]),
            // Una sola vez: si no, los bloques que el usuario sacó a mano volvían
            // en cada arranque.
            ...(s.planMileCompletado ? {} : { routines: s.routines.map(completarPlanMile), planMileCompletado: true }),
          }))
        })
      },
    }
  )
)

/**
 * El estado tal como se guarda en el teléfono, listo para el backup. La API
 * key no viaja: el archivo se manda por WhatsApp o se sube a Drive, y con la
 * key cualquiera podía usar la cuenta de Anthropic del usuario.
 */
export function serializarParaBackup(): string {
  const { anthropicApiKey: _key, ...state } = partialize(useStore.getState())
  void _key
  return JSON.stringify({ state, version: STORAGE_VERSION })
}

// Si el almacenamiento se llena, el entreno queda en memoria: hay que avisar
// para que se exporte un backup antes de cerrar la app.
let ultimoAvisoDeEspacio = 0
alFallarEscritura(() => {
  if (Date.now() - ultimoAvisoDeEspacio < 60_000) return
  ultimoAvisoDeEspacio = Date.now()
  queueMicrotask(() =>
    useStore.getState().addToast('No hay más espacio en el teléfono: exportá un backup desde Ajustes antes de cerrar la app', 'info')
  )
})

// La app abierta en dos lugares (la PWA instalada y una pestaña) se pisaba los
// datos: cada una escribía su estado viejo. Cuando la otra guarda, esta relee.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) void useStore.persist.rehydrate()
  })
}

/** Returns the merged list of built-in + custom exercises. Use this everywhere a user-created exercise might appear. */
export function useAllExercises(): Exercise[] {
  const exercises = useStore(s => s.exercises)
  const customExercises = useStore(s => s.customExercises)
  return useMemo(() => [...exercises, ...customExercises], [exercises, customExercises])
}
