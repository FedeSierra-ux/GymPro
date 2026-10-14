/**
 * Regresiones de la auditoría de octubre de 2026: cada test reproduce un bug
 * que se encontró y pasa sólo con el arreglo.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { incrementFor, suggestNextWeight } from '../progression'
import { buildProgressSeries } from '../progressSeries'
import { recordKindFor } from '../records'
import { inicioParaSemana, semanaDelPrograma } from '../program'
import { conColores, routineColor, ROUTINE_COLORS } from '../trainingDays'
import { DIA, ejercicio, entreno, serie } from './helpers'

// Los stores usan localStorage: en node no existe, se arma uno en memoria.
const memoria = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, v) },
  removeItem: (k: string) => { memoria.delete(k) },
})

type StoreModule = typeof import('../../store/useStore')
type WorkoutModule = typeof import('../../stores/workoutStore')
type BackupModule = typeof import('../backup')
let store: StoreModule
let workout: WorkoutModule
let backup: BackupModule

beforeAll(async () => {
  store = await import('../../store/useStore')
  workout = await import('../../stores/workoutStore')
  backup = await import('../backup')
})

const ayer = Date.now() - DIA

describe('progresión con pesos chicos', () => {
  const mancuernas = ejercicio('vuelos', { equipmentType: 'mancuernas', equipment: 'Mancuernas' })
  const plan = { sets: 3, repsMin: 12, repsMax: 12 }

  it('subir suma un salto exacto: 3 kg → 5 kg, no 6', () => {
    const w = entreno(ayer, [{ exerciseId: 'vuelos', sets: [serie(3, 12), serie(3, 12), serie(3, 12)] }])
    const s = suggestNextWeight(mancuernas, plan, [w], 'vuelos')
    expect(s?.reason).toBe('subir')
    expect(s?.kg).toBe(5)
  })

  it('bajar después de 3 semanas nunca propone más peso ni 0 kg', () => {
    const maquina = ejercicio('m', { equipmentType: 'maquina' })
    const viejo = Date.now() - 30 * DIA
    const s4 = suggestNextWeight(maquina, plan, [entreno(viejo, [{ exerciseId: 'm', sets: [serie(4, 12)] }])], 'm')
    expect(s4?.kg).toBeLessThanOrEqual(4)
    expect(s4?.kg).toBeGreaterThan(0)
    const s1 = suggestNextWeight(mancuernas, plan, [entreno(viejo, [{ exerciseId: 'vuelos', sets: [serie(1, 12)] }])], 'vuelos')
    expect(s1?.kg).toBeGreaterThan(0)
    const s7 = suggestNextWeight(mancuernas, plan, [entreno(viejo, [{ exerciseId: 'vuelos', sets: [serie(7, 12)] }])], 'vuelos')
    expect(s7?.reason).toBe('bajar')
    expect(s7?.kg).toBeLessThan(7)
  })

  it('propone bajar cuando las reps se desploman', () => {
    const w = entreno(ayer, [{ exerciseId: 'vuelos', sets: [serie(10, 1), serie(10, 1), serie(10, 1)] }])
    const s = suggestNextWeight(mancuernas, { sets: 3, repsMin: 10, repsMax: 12 }, [w], 'vuelos')
    expect(s?.reason).toBe('bajar')
    expect(s?.kg).toBe(8)
  })

  it('el salto sale del texto del equipamiento si falta el tipo', () => {
    expect(incrementFor({ ...ejercicio('p'), equipmentType: undefined, equipment: 'Máquina' })).toBe(5)
  })
})

describe('estancado', () => {
  it('subir reps con el mismo peso es progreso', () => {
    const ws = [8, 9, 10, 11, 12].map((reps, i) =>
      entreno(Date.now() - (10 - i) * DIA, [{ exerciseId: 'b', sets: [serie(40, reps)] }]))
    const [s] = buildProgressSeries(ws, [ejercicio('b')], 0, Date.now())
    expect(s.sinMejora).toBe(0)
    expect(s.current).toBe(40)
  })
})

describe('récords con lastre', () => {
  it('una serie con lastre no pasa todo el historial a kilos', () => {
    const sets = [{ kg: 0 }, { kg: 0 }, { kg: 0 }, { kg: 5 }]
    expect(recordKindFor(ejercicio('dominadas', { equipmentType: 'peso_corporal' }), sets)).toBe('reps')
  })
})

describe('semana del plan elegida un domingo', () => {
  it('la semana 1 elegida el domingo arranca el lunes', () => {
    const domingo = new Date(2026, 9, 11, 18).getTime()
    const lunes = new Date(2026, 9, 12, 9).getTime()
    expect(semanaDelPrograma(inicioParaSemana(1, domingo), lunes)).toBe(1)
  })
})

describe('colores de rutina', () => {
  it('borrar una rutina no recolorea a las demás', () => {
    const rutinas = conColores<{ id: string; color?: number }>([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const colorC = routineColor('c', rutinas)
    expect(routineColor('c', rutinas.filter((r) => r.id !== 'b'))).toBe(colorC)
  })

  it('una rutina nueva toma un color libre', () => {
    const rutinas = conColores<{ id: string; color?: number }>([{ id: 'a', color: 0 }, { id: 'c', color: 2 }, { id: 'n' }])
    expect(routineColor('n', rutinas)).toBe(ROUTINE_COLORS[1])
  })
})

describe('migración del estado guardado', () => {
  it('pasa el peso viejo a medidas y corrige la semana tipo de Mile', () => {
    const migrado = store.migrarEstado({
      bodyWeights: [{ date: 1000, kg: 60 }],
      weekPlan: { 1: 'mile-piernas', 3: 'mile-brazos', 5: 'mile-fullbody' },
      routines: [{ id: 'x', exercises: [] }],
    }, 0)
    expect(migrado.bodyWeights).toBeUndefined()
    expect((migrado.measures as Array<{ weightKg: number }>)[0].weightKg).toBe(60)
    expect(migrado.weekPlan).toEqual({ 0: 'mile-piernas', 2: 'mile-brazos', 4: 'mile-fullbody' })
    expect((migrado.routines as Array<{ color: number }>)[0].color).toBe(0)
  })

  it('no toca una semana tipo armada a mano', () => {
    const plan = { 1: 'mile-piernas', 3: 'mile-brazos', 5: 'otra' }
    expect(store.migrarEstado({ weekPlan: plan }, 0).weekPlan).toEqual(plan)
  })
})

describe('backup', () => {
  const archivo = (state: unknown, version = 1) =>
    JSON.stringify({ app: 'gympro', exportedAt: 5, data: JSON.stringify({ state, version }) })

  it('rechaza un estado roto y el volcado del entreno en curso', () => {
    expect(() => backup.parseBackup(archivo({ workouts: null }))).toThrow()
    expect(() => backup.parseBackup(JSON.stringify({ state: { activeWorkout: null }, version: 0 }))).toThrow()
    expect(() => backup.parseBackup(archivo({ workouts: [{ id: 'w', startedAt: 'ayer', exercises: [] }] }))).toThrow()
  })

  it('rechaza una versión más nueva que la app', () => {
    expect(() => backup.parseBackup(archivo({ workouts: [] }, 99))).toThrow(/más nueva/)
  })

  it('migra un backup viejo al importarlo', () => {
    const b = backup.parseBackup(archivo({ workouts: [], bodyWeights: [{ date: 1, kg: 70 }] }, 0))
    const parsed = JSON.parse(b.data)
    expect(parsed.version).toBe(store.STORAGE_VERSION)
    expect(parsed.state.measures[0].weightKg).toBe(70)
  })

  it('el backup no lleva la API key', () => {
    store.useStore.setState({ anthropicApiKey: 'sk-ant-secreta' })
    const exportado = store.serializarParaBackup()
    expect(exportado).not.toContain('sk-ant-secreta')
    expect(JSON.parse(exportado).state.workouts).toBeDefined()
  })

  it('al importar guarda una copia de lo anterior y la fecha del backup', () => {
    memoria.set(store.STORAGE_KEY, JSON.stringify({ state: { workouts: [], userName: 'antes' }, version: 1 }))
    const b = backup.parseBackup(archivo({ workouts: [], userName: 'después' }))
    backup.applyBackup(b)
    expect(JSON.parse(memoria.get(backup.PREVIOUS_KEY)!).state.userName).toBe('antes')
    const nuevo = JSON.parse(memoria.get(store.STORAGE_KEY)!)
    expect(nuevo.state.userName).toBe('después')
    expect(nuevo.state.lastBackupAt).toBe(5)
  })
})

describe('entreno en curso', () => {
  beforeEach(() => {
    store.useStore.setState({
      routines: [{ id: 'r', name: 'R', emoji: '', createdAt: 0, exercises: [
        { exerciseId: 'pecho-01', sets: 2, repsMin: 8, repsMax: 10, order: 0 },
        { exerciseId: 'core-03', sets: 2, repsMin: 8, repsMax: 10, order: 1, targetSeconds: 30 },
      ] }],
      workouts: [],
      programa: null,
    })
    workout.useWorkoutStore.getState().startWorkout('r')
    const aw = workout.useWorkoutStore.getState()
    aw.updateSetValue(0, 0, 'reps', '8')
    aw.updateSetValue(0, 1, 'reps', '8')
  })

  it('bajar el descanso a 0 lo termina en vez de dejarlo clavado', () => {
    const s = workout.useWorkoutStore.getState()
    s.completeSet(0, 0, { startRest: true })
    expect(workout.useWorkoutStore.getState().activeWorkout?.restTimerVisible).toBe(true)
    s.adjustRestTimer(-600)
    expect(workout.useWorkoutStore.getState().activeWorkout?.restTimerVisible).toBe(false)
  })

  it('confirmar con un toque no corta el descanso que está corriendo', () => {
    const s = workout.useWorkoutStore.getState()
    s.completeSet(0, 0, { startRest: true })
    s.completeSet(0, 1)
    expect(workout.useWorkoutStore.getState().activeWorkout?.restTimerVisible).toBe(true)
  })

  it('+ Serie copia la duración en los ejercicios por tiempo', () => {
    const s = workout.useWorkoutStore.getState()
    s.updateSetValue(1, 1, 'duration', '45')
    s.addSetToExercise(1)
    const sets = workout.useWorkoutStore.getState().activeWorkout!.exercises[1].sets
    expect(sets[sets.length - 1].duration).toBe('45')
  })

  it('cambiar un ejercicio conserva las series ya hechas', () => {
    const s = workout.useWorkoutStore.getState()
    s.completeSet(0, 0)
    s.replaceExerciseInWorkout(0, 'pecho-02')
    const exs = workout.useWorkoutStore.getState().activeWorkout!.exercises
    expect(exs[0].exerciseId).toBe('pecho-01')
    expect(exs[0].sets.filter((x) => x.completed)).toHaveLength(1)
    expect(exs[1].exerciseId).toBe('pecho-02')
  })

  it('terminar guarda la hora real de cada serie y cierra el entreno una sola vez', () => {
    const s = workout.useWorkoutStore.getState()
    s.completeSet(0, 0)
    s.finishWorkout()
    expect(workout.useWorkoutStore.getState().activeWorkout).toBeNull()
    const ws = store.useStore.getState().workouts
    expect(ws).toHaveLength(1)
    expect(Number.isFinite(ws[0].exercises[0].sets[0].completedAt)).toBe(true)
    workout.useWorkoutStore.getState().finishWorkout()
    expect(store.useStore.getState().workouts).toHaveLength(1)
  })
})

describe('editar un entreno', () => {
  it('una fecha inválida no se guarda', () => {
    const w = entreno(ayer, [{ exerciseId: 'b', sets: [serie(40, 8)] }], 'w1')
    store.useStore.setState({ workouts: [w] })
    store.useStore.getState().updateWorkout({ ...w, startedAt: NaN, finishedAt: NaN })
    expect(store.useStore.getState().workouts[0].startedAt).toBe(ayer)
  })
})

describe('ejercicios propios', () => {
  it('borrar archiva: el historial lo sigue encontrando y crearlo de nuevo lo recupera', () => {
    store.useStore.setState({ customExercises: [], routines: [] })
    const ex = store.useStore.getState().createCustomExercise('Remo raro')!
    store.useStore.getState().deleteCustomExercise(ex.id)
    expect(store.useStore.getState().customExercises.find((e) => e.id === ex.id)?.archived).toBe(true)
    const otra = store.useStore.getState().createCustomExercise('Remo raro')!
    expect(otra.id).toBe(ex.id)
    expect(store.useStore.getState().customExercises.find((e) => e.id === ex.id)?.archived).toBeUndefined()
  })
})

describe('almacenamiento', () => {
  it('cambiar de pestaña no reescribe los datos', () => {
    store.useStore.setState({ userName: 'Mile' })
    const escrito = memoria.get(store.STORAGE_KEY)
    const spy = vi.spyOn(globalThis.localStorage, 'setItem')
    store.useStore.getState().setActiveTab('progreso')
    store.useStore.getState().addToast('hola', 'info')
    expect(spy).not.toHaveBeenCalled()
    expect(memoria.get(store.STORAGE_KEY)).toBe(escrito)
    spy.mockRestore()
  })
})
