import { describe, expect, it, vi } from 'vitest'
import type { FilaEjercicioCiclo } from '../cycleReport'
import {
  candidatosACambiar, ciclosParaListar, claveMes, fechaLarga, losQueMasSubieron, mesDeLaTarjeta, planificadasPorSemana,
  rangoCiclo, rangosParaComparar, tarjetasDelAnio, textoMarca, textoPct,
} from '../informes'
import { finDeCiclo, lunesDe } from '../program'
import { computeRecords } from '../records'
import { resumenAnual } from '../yearReview'
import { ejercicio, entreno, serie } from './helpers'

const f = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h).getTime()

describe('textos', () => {
  it('marcas según la unidad', () => {
    expect(textoMarca('kg', { kg: 132.5, reps: 8 })).toBe('132,5 × 8')
    expect(textoMarca('reps', { kg: 0, reps: 12 })).toBe('12 reps')
    expect(textoMarca('tiempo', { kg: 0, reps: 0, durationSec: 90 })).toBe('1:30 min')
  })

  it('porcentajes con signo, espacio duro y menos tipográfico', () => {
    expect(textoPct(7.7)).toBe('+8 %')
    expect(textoPct(-16.7)).toBe('−17 %')
    expect(textoPct(0.4)).toBe('+0,4 %')
    expect(textoPct(0)).toBe('0 %')
    expect(textoPct(null)).toBe('—')
  })

  it('fechas: rango del ciclo hasta el domingo, fecha larga y clave de mes', () => {
    const inicio = f(2026, 8, 14)
    expect(rangoCiclo(inicio, finDeCiclo(inicio))).toBe('14/9 – 25/10')
    expect(fechaLarga(f(2026, 9, 14, 10))).toBe('14 de octubre')
    expect(claveMes(2026, 0)).toBe('2026-01')
  })
})

describe('mesDeLaTarjeta', () => {
  it('del 1 al 7 ofrece el mes anterior', () => {
    expect(mesDeLaTarjeta(f(2026, 9, 1, 8))).toEqual({ year: 2026, month: 8 })
    expect(mesDeLaTarjeta(f(2026, 9, 7, 23))).toEqual({ year: 2026, month: 8 })
    expect(mesDeLaTarjeta(f(2026, 9, 8, 0))).toBeNull()
    expect(mesDeLaTarjeta(f(2027, 0, 3))).toEqual({ year: 2026, month: 11 })
  })
})

describe('rangosParaComparar', () => {
  it('un mes cerrado se compara entero con el anterior', () => {
    const r = rangosParaComparar(2026, 8, 'anterior', f(2026, 9, 14))
    expect(r.parcial).toBe(false)
    expect(r.actual).toEqual({ desde: f(2026, 8, 1), hasta: f(2026, 9, 1) })
    expect(r.referencia).toEqual({ desde: f(2026, 7, 1), hasta: f(2026, 8, 1) })
    expect(r.etiqueta).toBe('agosto')
  })

  it('el mes en curso se compara contra los mismos días', () => {
    const r = rangosParaComparar(2026, 9, 'anterior', f(2026, 9, 14, 18))
    expect(r.parcial).toBe(true)
    expect(r.referencia).toEqual({ desde: f(2026, 8, 1), hasta: f(2026, 8, 15) })
    expect(r.etiqueta).toBe('1–14 sep')
    const a = rangosParaComparar(2026, 9, 'anioPasado', f(2026, 9, 14, 18))
    expect(a.referencia).toEqual({ desde: f(2025, 9, 1), hasta: f(2025, 9, 15) })
    expect(a.etiqueta).toBe('1–14 oct 2025')
  })

  it('un 31 contra febrero no se pasa del mes de referencia', () => {
    const r = rangosParaComparar(2026, 2, 'anterior', f(2026, 2, 31, 9))
    expect(r.referencia.hasta).toBe(f(2026, 2, 1))
  })
})

describe('planificadasPorSemana', () => {
  const routines = [{ id: 'a' }, { id: 'b' }]
  const weekPlan = { 0: 'a', 2: 'b', 4: 'a', 5: 'borrada' }
  const lunes = lunesDe(f(2026, 9, 14))
  const siguiente = lunesDe(f(2026, 9, 21))

  it('cuenta los días con rutina, desde el primer uso', () => {
    const plan = planificadasPorSemana({ weekPlan, weekOverrides: {}, weeklyGoal: null, routines, inicioUso: f(2026, 9, 14, 9), workouts: [] })
    // Empezó el miércoles: lunes no cuenta; miércoles y viernes sí. La rutina borrada nunca.
    expect(plan(lunes)).toBe(2)
    expect(plan(siguiente)).toBe(3)
    expect(plan(lunesDe(f(2026, 9, 5)))).toBe(0)
  })

  it('una semana con plan propio usa ese plan', () => {
    const plan = planificadasPorSemana({
      weekPlan, weekOverrides: { '2026-10-19': { 0: 'a', 1: null, 2: null, 3: null, 4: null, 5: null, 6: null } },
      weeklyGoal: null, routines, inicioUso: null, workouts: [],
    })
    expect(plan(siguiente)).toBe(1)
  })

  it('con meta semanal manda la meta, salvo antes de empezar', () => {
    const plan = planificadasPorSemana({ weekPlan, weekOverrides: {}, weeklyGoal: 4, routines, inicioUso: f(2026, 9, 14, 9), workouts: [] })
    expect(plan(lunes)).toBe(4)
    expect(plan(lunesDe(f(2026, 9, 5)))).toBe(0)
  })
})

describe('ciclosParaListar', () => {
  const nowTs = f(2026, 9, 14, 12)
  const pasados = [{ inicio: f(2026, 3, 6), fin: f(2026, 4, 18) }, { inicio: f(2026, 5, 1), fin: f(2026, 6, 13) }]

  it('el ciclo en curso primero, después los pasados del más nuevo al más viejo', () => {
    const inicio = lunesDe(f(2026, 8, 23)) // semana 4
    const l = ciclosParaListar({ inicio, fase: 'alt' }, pasados, nowTs)
    expect(l.map((c) => [c.inicio, c.enCurso, c.semana])).toEqual([
      [inicio, true, 4], [pasados[1].inicio, false, null], [pasados[0].inicio, false, null],
    ])
    expect(l[0].fin).toBe(finDeCiclo(inicio))
  })

  it('pasada la semana 6 deja de estar en curso; uno terminado no se lista dos veces', () => {
    const inicio = lunesDe(f(2026, 7, 10))
    expect(ciclosParaListar({ inicio, fase: 'alt' }, [], nowTs)[0]).toMatchObject({ enCurso: false, semana: null })
    expect(ciclosParaListar({ inicio, fase: 'base', terminado: true }, [{ inicio, fin: finDeCiclo(inicio) }], nowTs)).toHaveLength(1)
    expect(ciclosParaListar(null, [], nowTs)).toEqual([])
  })
})

describe('qué subió y qué cambiar', () => {
  const fila = (exerciseId: string, cambioPct: number, base: number | null, alt: number | null): FilaEjercicioCiclo => ({
    exerciseId, kind: 'kg', antes: { kg: 1, reps: 1, semana: 1 }, despues: { kg: 1, reps: 1, semana: 6 },
    cambioPct, porSemana: [], dentroDeBloque: { base, alt },
  })
  const filas = [fila('a', 20, 5, 5), fila('b', -16.7, 0, 25), fila('c', 0, 0, 0), fila('d', -5, null, -3), fila('e', 3, 1, 1), fila('f', 8, 0, 0)]

  it('los que más subieron, sin los que bajaron', () => {
    expect(losQueMasSubieron(filas).map((x) => x.exerciseId)).toEqual(['a', 'f', 'e'])
  })

  it('candidatos: sin progreso ni entre bloques ni dentro de ellos', () => {
    // b baja entre bloques pero sube dentro del 4-6: progresa.
    expect(candidatosACambiar(filas).map((x) => x.exerciseId)).toEqual(['c', 'd'])
  })
})

describe('tarjetasDelAnio', () => {
  const ejercicios = [ejercicio('banca')]
  const ws = Array.from({ length: 10 }, (_, i) =>
    ({ ...entreno(f(2026, 9, 14 + i * 3, 19), [{ exerciseId: 'banca', sets: [serie(60 + i * 2.5, 8), serie(60, 8)] }]), durationMin: 60 }))
  const nombre = (id: string) => (id === 'banca' ? 'Press de banca' : id)

  it('arranca diciendo desde cuándo, y sin datos no hay tarjeta de cuerpo', () => {
    const r = resumenAnual({
      workouts: ws, exercises: ejercicios, prs: computeRecords(ws, ejercicios), measures: [], ciclos: [],
      inicioUso: f(2026, 9, 14, 10), year: 2026, nowTs: f(2026, 11, 10),
    })
    const t = tarjetasDelAnio(r, nombre)
    expect(t[0]).toMatchObject({ id: 'intro', grande: '2026', frase: 'Desde el 14 de octubre, esto es lo que hiciste.' })
    expect(t.map((x) => x.id)).toEqual(['intro', 'entrenos', 'toneladas', 'records', 'ejercicio', 'racha', 'dia', 'final'])
    const records = t.find((x) => x.id === 'records')!
    expect(records.grande).toBe('9')
    expect(records.tono).toBe('record')
    // Nueve récords de banca, pero en la lista va una sola vez.
    expect(records.lista?.map((x) => x.nombre)).toEqual(['Press de banca'])
    expect(t.find((x) => x.id === 'toneladas')?.frase).toMatch(/^Es como levantar [\d,]+ (pianos de cola|autos|elefantes)\.$/)
    expect(t.find((x) => x.id === 'ejercicio')?.grande).toBe('Press de banca')
    expect(t.find((x) => x.id === 'dia')?.frase).toBe(`Los ${t.find((x) => x.id === 'dia')!.grande.toLowerCase()} a la noche son tuyos.`)
  })

  it('con mediciones agrega la del cuerpo', () => {
    const r = resumenAnual({
      workouts: ws, exercises: ejercicios, prs: [], ciclos: [], inicioUso: null, year: 2026, nowTs: f(2026, 11, 10),
      measures: [{ id: 'a', date: f(2026, 9, 15, 12), weightKg: 80 }, { id: 'b', date: f(2026, 10, 15, 12), weightKg: 78.5 }],
    })
    const cuerpo = tarjetasDelAnio(r, nombre).find((x) => x.id === 'cuerpo')
    expect(cuerpo).toMatchObject({ grande: '−1,5', unidad: 'kg' })
    // Sin récords no hay tarjeta de récords.
    expect(tarjetasDelAnio(r, nombre).some((x) => x.id === 'records')).toBe(false)
  })
})

describe('backup con las tarjetas cerradas', () => {
  it('las acepta, y si vienen mal las olvida en vez de rechazar el archivo', async () => {
    const memoria = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => { memoria.set(k, v) },
      removeItem: (k: string) => { memoria.delete(k) },
    })
    const backup = await import('../backup')
    const archivo = (state: unknown) => JSON.stringify({ app: 'gympro', exportedAt: 5, data: JSON.stringify({ state, version: 2 }) })
    const ok = JSON.parse(backup.parseBackup(archivo({ workouts: [], resumenMesCerrado: '2026-09', wrappedCerrado: 2025 })).data)
    expect(ok.state).toMatchObject({ resumenMesCerrado: '2026-09', wrappedCerrado: 2025 })
    const mal = JSON.parse(backup.parseBackup(archivo({ workouts: [], resumenMesCerrado: 7, wrappedCerrado: 'ayer' })).data)
    expect(mal.state.resumenMesCerrado).toBeUndefined()
    expect(mal.state.wrappedCerrado).toBeUndefined()
  })
})
