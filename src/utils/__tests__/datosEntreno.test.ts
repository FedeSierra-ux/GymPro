/**
 * Los datos que se empiezan a guardar en la 1.3.0: de dónde salió cada
 * entreno, con qué semana y variante del plan se hizo, el historial de ciclos
 * y el día en que se empezó a usar la app. Más "Terminar" con series cargadas
 * sin tildar.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { finDeCiclo, inicioParaSemana, lunesDe } from '../program'
import { DIA } from './helpers'

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

const rutina = {
  id: 'r', name: 'R', emoji: '', createdAt: 0, variante: 'alt' as const,
  exercises: [
    { exerciseId: 'pecho-01', sets: 2, repsMin: 8, repsMax: 10, order: 0, alt: { sets: 3, repsMin: 6, repsMax: 8 } },
    { exerciseId: 'core-03', sets: 2, repsMin: 8, repsMax: 10, order: 1, targetSeconds: 30 },
  ],
}

const ws = () => workout.useWorkoutStore.getState()
const ultimo = () => store.useStore.getState().workouts.at(-1)!

beforeEach(() => {
  workout.useWorkoutStore.setState({ activeWorkout: null })
  store.useStore.setState({ routines: [rutina], workouts: [], programa: null, ciclosPrograma: [], inicioUso: null })
})

function hacerUnaSerie() {
  ws().updateSetValue(0, 0, 'reps', '8')
  ws().completeSet(0, 0)
}

describe('de dónde salió cada entreno', () => {
  it('en vivo, con la semana del plan y la variante de la rutina', () => {
    store.useStore.setState({ programa: { inicio: inicioParaSemana(5, Date.now()), fase: 'alt' } })
    ws().startWorkout('r')
    hacerUnaSerie()
    ws().finishWorkout()
    expect(ultimo().origen).toBe('en-vivo')
    expect(ultimo().semanaPrograma).toBe(5)
    expect(ultimo().variante).toBe('alt')
  })

  it('sin plan en curso no guarda semana', () => {
    ws().startWorkout('r')
    hacerUnaSerie()
    ws().finishWorkout()
    expect(ultimo().semanaPrograma).toBeUndefined()
  })

  it('cargado desde la Agenda es manual', () => {
    ws().startWorkout('r', Date.now() - 3 * DIA)
    hacerUnaSerie()
    ws().finishWorkout()
    expect(ultimo().origen).toBe('manual')
  })

  it('pasarlo a ayer es cargarlo a mano; volverlo a hoy, no', () => {
    ws().startWorkout('r')
    ws().setWorkoutDate(Date.now() - DIA)
    expect(ws().activeWorkout?.origen).toBe('manual')
    ws().setWorkoutDate(Date.now())
    expect(ws().activeWorkout?.origen).toBe('en-vivo')
  })

  it('el cierre automático queda marcado', () => {
    ws().startWorkout('r')
    hacerUnaSerie()
    workout.useWorkoutStore.setState((s) => ({ activeWorkout: { ...s.activeWorkout!, realStartedAt: Date.now() - 5 * 3600000 } }))
    expect(ws().autoCloseStaleWorkout()).toBe(true)
    expect(ultimo().origen).toBe('auto')
  })
})

describe('historial de ciclos', () => {
  const entrenoEn = (ts: number) => ({ id: `w${ts}`, routineId: 'r', startedAt: ts, finishedAt: ts + 3600000, exercises: [] })

  it('volver a empezar el plan guarda el ciclo anterior', () => {
    const inicio = lunesDe(Date.now() - 50 * DIA)
    store.useStore.setState({
      programa: { inicio, fase: 'alt' },
      workouts: [entrenoEn(inicio + DIA), entrenoEn(inicio + 30 * DIA)],
    })
    store.useStore.getState().fijarSemanaPrograma(1)
    const { ciclosPrograma, programa } = store.useStore.getState()
    expect(ciclosPrograma).toEqual([{ inicio, fin: finDeCiclo(inicio) }])
    expect(programa?.inicio).toBe(inicioParaSemana(1, Date.now()))
  })

  it('corregir la semana a los pocos días no inventa un ciclo', () => {
    const inicio = inicioParaSemana(1, Date.now())
    store.useStore.setState({ programa: { inicio, fase: 'base' }, workouts: [entrenoEn(Date.now() - 1000)] })
    store.useStore.getState().fijarSemanaPrograma(2)
    store.useStore.getState().fijarSemanaPrograma(1)
    expect(store.useStore.getState().ciclosPrograma).toEqual([])
  })

  it('terminar el plan lo guarda una sola vez', () => {
    const inicio = lunesDe(Date.now() - 45 * DIA)
    store.useStore.setState({ programa: { inicio, fase: 'alt' }, workouts: [entrenoEn(inicio + DIA)] })
    store.useStore.getState().terminarPrograma()
    store.useStore.getState().retomarPrograma()
    store.useStore.getState().fijarSemanaPrograma(1)
    expect(store.useStore.getState().ciclosPrograma).toHaveLength(1)
  })
})

describe('inicio de uso', () => {
  it('se fija al terminar el onboarding y no se mueve', () => {
    store.useStore.getState().setOnboarded()
    const inicio = store.useStore.getState().inicioUso
    expect(inicio).toBe(new Date(new Date().setHours(0, 0, 0, 0)).getTime())
    store.useStore.setState({ inicioUso: 123 })
    store.useStore.getState().setOnboarded()
    expect(store.useStore.getState().inicioUso).toBe(123)
  })

  it('la migración lo toma del primer entreno y marca los cargados a mano', () => {
    const mediodia = new Date(2026, 8, 3, 12, 0, 0, 0).getTime()
    const tarde = new Date(2026, 8, 1, 19, 12).getTime()
    const migrado = store.migrarEstado({ workouts: [
      { id: 'a', routineId: 'r', startedAt: mediodia, exercises: [] },
      { id: 'b', routineId: 'r', startedAt: tarde, exercises: [] },
    ] }, 1)
    const workouts = migrado.workouts as Array<{ origen?: string }>
    expect(workouts[0].origen).toBe('manual')
    expect(workouts[1].origen).toBeUndefined()
    expect(migrado.inicioUso).toBe(new Date(2026, 8, 1).getTime())
    expect(migrado.ciclosPrograma).toEqual([])
  })
})

describe('terminar con series cargadas sin tildar', () => {
  beforeEach(() => {
    ws().startWorkout('r')
  })

  it('lo prellenado de la vez anterior no cuenta como cargado', () => {
    expect(workout.seriesCargadas(ws().activeWorkout!, store.useStore.getState().exercises)).toEqual([])
  })

  it('"Guardar también esas" guarda la serie cargada', () => {
    hacerUnaSerie()
    ws().updateSetValue(0, 1, 'kg', '40')
    ws().updateSetValue(0, 1, 'reps', '6')
    const exercises = store.useStore.getState().exercises
    expect(workout.seriesCargadas(ws().activeWorkout!, exercises)).toEqual([{ exIdx: 0, setIdx: 1 }])
    ws().finishWorkout({ incluirCargadas: true })
    expect(ultimo().exercises[0].sets.map((s) => [s.kg, s.reps])).toEqual([[0, 8], [40, 6]])
  })

  it('"Terminar sin ellas" las deja afuera', () => {
    hacerUnaSerie()
    ws().updateSetValue(0, 1, 'reps', '6')
    ws().finishWorkout()
    expect(ultimo().exercises[0].sets).toHaveLength(1)
  })

  it('alcanza con una serie cargada aunque no haya ninguna tildada', () => {
    ws().updateSetValue(0, 0, 'reps', '9')
    ws().finishWorkout({ incluirCargadas: true })
    expect(ultimo().exercises[0].sets[0].reps).toBe(9)
  })
})

describe('primer uso: los días de antes no son faltas', () => {
  it('cuenta desde el inicio de uso, o desde un entreno cargado de antes', async () => {
    const { inicioDeFaltas, monthStats, plannedDowSet } = await import('../trainingDays')
    const inicio = new Date(2026, 9, 14).getTime()
    expect(inicioDeFaltas(inicio, [])).toBe(inicio)
    const antes = new Date(2026, 9, 10, 19).getTime()
    expect(inicioDeFaltas(inicio, [{ id: 'a', routineId: 'r', startedAt: antes, finishedAt: antes + 1, exercises: [] }]))
      .toBe(new Date(2026, 9, 10).getTime())
    expect(inicioDeFaltas(null, [])).toBeNull()

    // Plan de lunes a sábado; la app se instaló el martes 14 y hoy es el 15.
    const plan = plannedDowSet({ 0: 'r', 1: 'r', 2: 'r', 3: 'r', 4: 'r', 5: 'r' })
    const hoy = new Date(2026, 9, 15, 20).getTime()
    const desdeInicio = (d: Date) => d.getTime() >= inicio && plan.has((d.getDay() + 6) % 7)
    expect(monthStats([], 2026, 9, hoy, desdeInicio).planned).toBe(2)
  })
})
