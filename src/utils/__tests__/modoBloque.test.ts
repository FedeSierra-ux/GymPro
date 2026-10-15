/**
 * Modo bloque en el store del entreno: el descanso que arranca al cerrar la
 * ronda de un circuito o superserie, y el tabata que marca las series del
 * bloque con las mismas acciones que el tilde.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMileRoutines } from '../../data/mileRoutines'

const memoria = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, v) },
  removeItem: (k: string) => { memoria.delete(k) },
})

type StoreModule = typeof import('../../store/useStore')
type WorkoutModule = typeof import('../../stores/workoutStore')
let store: StoreModule
let workout: WorkoutModule

beforeAll(async () => {
  store = await import('../../store/useStore')
  workout = await import('../../stores/workoutStore')
})

const ws = () => workout.useWorkoutStore.getState()
const aw = () => ws().activeWorkout!
const mile = buildMileRoutines(0)
const simple = {
  id: 'simple', name: 'Simple', emoji: '', createdAt: 0,
  exercises: [
    { exerciseId: 'pecho-01', sets: 2, repsMin: 8, repsMax: 10, order: 0 },
    { exerciseId: 'espalda-01', sets: 2, repsMin: 8, repsMax: 10, order: 1 },
  ],
}

beforeEach(() => {
  workout.useWorkoutStore.setState({ activeWorkout: null })
  store.useStore.setState({ routines: [...mile, simple], workouts: [], prs: [], programa: null, toasts: [] })
})
afterEach(() => { vi.useRealTimers() })

/** Carga reps (o tiempo) y tilda, como en la pantalla. */
function hacer(exIdx: number, setIdx: number, opts?: { startRest?: boolean }) {
  const st = aw().exercises[exIdx].sets[setIdx]
  if (st.duration !== undefined) { if (!st.duration) ws().updateSetValue(exIdx, setIdx, 'duration', '20') }
  else if (!st.reps) ws().updateSetValue(exIdx, setIdx, 'reps', '10')
  ws().completeSet(exIdx, setIdx, opts)
}

describe('descanso por rondas', () => {
  it('circuito: entre A, B y C no se descansa; al cerrar la ronda, sí', () => {
    ws().startWorkout('mile-piernas')
    hacer(0, 0)
    expect(aw().restTimerVisible).toBe(false)
    hacer(1, 0)
    expect(aw().restTimerVisible).toBe(false)
    hacer(2, 0)
    expect(aw().restTimerVisible).toBe(true)
    // Ninguna nota del circuito dice descanso: va el de por defecto.
    expect(aw().restTotalSeconds).toBe(75)
  })

  it('superserie: el tiempo sale de la nota si la tiene', () => {
    const conNota = mile.map((r) => r.id !== 'mile-fullbody' ? r : {
      ...r,
      exercises: r.exercises.map((re) => re.exerciseId === 'piernas-16' ? { ...re, note: 'Por pierna · descanso 1:30' } : re),
    })
    store.useStore.setState({ routines: conNota })
    ws().startWorkout('mile-fullbody')
    hacer(2, 0)
    expect(aw().restTimerVisible).toBe(false)
    hacer(3, 0)
    expect(aw().restTimerVisible).toBe(true)
    expect(aw().restTotalSeconds).toBe(90)
  })

  it('mantener apretado en el medio de la ronda igual arranca el descanso', () => {
    ws().startWorkout('mile-piernas')
    hacer(0, 0, { startRest: true })
    expect(aw().restTimerVisible).toBe(true)
  })

  it('sin bloques, todo como antes: el tilde solo no arranca el descanso', () => {
    ws().startWorkout('simple')
    hacer(0, 0)
    expect(aw().restTimerVisible).toBe(false)
    hacer(0, 1)
    expect(aw().restTimerVisible).toBe(false)
    hacer(1, 0, { startRest: true })
    expect(aw().restTimerVisible).toBe(true)
  })

  it('el que reemplaza a otro guarda a quién reemplaza', () => {
    ws().startWorkout('mile-piernas')
    ws().replaceExerciseInWorkout(1, 'core-01')
    expect(aw().exercises[1]).toMatchObject({ exerciseId: 'core-01', reemplazaA: 'core-13' })
    const g = workout.bloquesDelEntreno(aw())[0].grupos[0]
    expect(g).toEqual({ tipo: 'circuito', indices: [0, 1, 2] })
  })
})

describe('tabata', () => {
  const TABATA = [8, 9, 10, 11]

  it('al terminar marca las 16 series, con reps y tiempo cargados', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    ws().startWorkout('mile-piernas')
    ws().empezarTabata(8)
    expect(aw().tabata).toMatchObject({ primerEjercicio: 'piernas-17', desdeRonda: 0, sonido: true })
    vi.setSystemTime(1_000_000 + 470_000)
    expect(ws().cerrarTabata()).toBe(16)
    expect(aw().tabata).toBeUndefined()
    for (const i of TABATA) {
      const sets = aw().exercises[i].sets
      expect(sets.every((s) => s.completed && s.completedAt === 1_000_000 + 470_000)).toBe(true)
    }
    // Sin datos de la vez anterior: las reps mínimas del plan y los 20 s de trabajo.
    expect(aw().exercises[8].sets[0].reps).toBe('10')
    expect(aw().exercises[10].sets[0].duration).toBe('20')
    // Y se guardan como cualquier serie.
    hacer(0, 0)
    ws().finishWorkout()
    const guardado = store.useStore.getState().workouts.at(-1)!
    expect(guardado.exercises[8].sets).toHaveLength(4)
  })

  it('cerrar antes de una ronda no marca nada; después de una, marca esa', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2_000_000)
    ws().startWorkout('mile-piernas')
    ws().empezarTabata(9)
    vi.setSystemTime(2_000_000 + 50_000)
    expect(ws().cerrarTabata()).toBe(0)

    ws().empezarTabata(9)
    vi.setSystemTime(2_000_000 + 50_000 + 115_000)
    expect(ws().cerrarTabata()).toBe(4)
    expect(TABATA.map((i) => aw().exercises[i].sets.filter((s) => s.completed).length)).toEqual([1, 1, 1, 1])

    // La próxima vez arranca de la ronda 2.
    ws().empezarTabata(8)
    expect(aw().tabata?.desdeRonda).toBe(1)
  })

  it('la pausa no cuenta y saltar corre el reloj', () => {
    vi.useFakeTimers()
    vi.setSystemTime(3_000_000)
    ws().startWorkout('mile-piernas')
    ws().empezarTabata(8)
    vi.setSystemTime(3_000_000 + 10_000)
    ws().pausarTabata()
    vi.setSystemTime(3_000_000 + 70_000)
    expect(workout.segundoTabata(aw().tabata!, Date.now())).toBe(10)
    ws().reanudarTabata()
    vi.setSystemTime(3_000_000 + 75_000)
    expect(workout.segundoTabata(aw().tabata!, Date.now())).toBe(15)
    ws().moverTabata(110)
    expect(workout.segundoTabata(aw().tabata!, Date.now())).toBe(110)
    expect(ws().cerrarTabata()).toBe(4)
  })

  it('empezar el tabata corta un descanso que estaba corriendo', () => {
    ws().startWorkout('mile-piernas')
    hacer(3, 0, { startRest: true })
    expect(aw().restTimerVisible).toBe(true)
    ws().empezarTabata(8)
    expect(aw().restTimerVisible).toBe(false)
    // Fuera del tabata no hace nada.
    ws().cerrarTabata()
    ws().empezarTabata(3)
    expect(aw().tabata).toBeUndefined()
  })
})
