import { describe, expect, it } from 'vitest'
import type { Workout } from '../../types'
import {
  cambioPct, compararPeriodos, mesAnterior, mismoMesAnioAnterior, rangoMes, recordsEnRango, resumenPeriodo,
} from '../periodSummary'
import { computeRecords } from '../records'
import { ejercicio, serie } from './helpers'

let n = 0
function w(
  [y, m, d, h = 18, min = 0]: [number, number, number, number?, number?],
  routineId: string,
  exercises: Workout['exercises'],
  extra: Partial<Workout> = {},
): Workout {
  const startedAt = new Date(y, m, d, h, min).getTime()
  return { id: `w${n++}`, routineId, startedAt, finishedAt: startedAt + 3600000, exercises, ...extra }
}

const EJERCICIOS = [
  ejercicio('banca'),
  ejercicio('sentadilla', { muscleGroup: 'piernas' }),
  ejercicio('dominadas', { muscleGroup: 'espalda', equipmentType: 'peso_corporal' }),
  ejercicio('cinta', { muscleGroup: 'cardio', trackingType: 'duration' }),
]

const banca = (kg: number, reps: number) => ({
  exerciseId: 'banca', sets: [serie(40, 10, { isWarmup: true }), serie(kg, reps), serie(kg, reps), serie(kg, reps)],
})
const sentadilla = (kg: number, reps: number) => ({ exerciseId: 'sentadilla', sets: [serie(kg, reps), serie(kg, reps), serie(kg, reps)] })

// Octubre de 2026. El lunes 26 es el primero después del cambio de horario en Europa.
const WORKOUTS: Workout[] = [
  // Septiembre: la primera banca de la historia.
  w([2026, 8, 30, 8], 'A', [banca(60, 10)], { origen: 'en-vivo', durationMin: 55 }),
  w([2026, 8, 23, 19], 'B', [sentadilla(70, 8)], { durationMin: 45 }),
  // Octubre.
  w([2026, 9, 5, 8], 'A', [banca(60, 10)], { origen: 'en-vivo', durationMin: 60 }),
  w([2026, 9, 7, 19, 30], 'B', [sentadilla(80, 8)], { durationMin: 50 }), // viejo, sin origen: vale
  w([2026, 9, 9, 12], 'A', [banca(60, 10)], { origen: 'manual', durationMin: 2 }), // hora inventada
  w([2026, 9, 12, 8, 15], 'A', [banca(62.5, 8)], { origen: 'auto', durationMin: 120 }), // se cerró solo
  w([2026, 9, 14, 8, 30], 'B', [sentadilla(80, 10)], { origen: 'en-vivo', durationMin: 70 }),
  w([2026, 9, 26, 0, 30], 'A', [banca(65, 6), { exerciseId: 'dominadas', sets: [serie(0, 8), serie(0, 10)] }], { origen: 'en-vivo' }),
  // Sin terminar: no cuenta.
  { ...w([2026, 9, 28], 'A', [banca(100, 10)], { origen: 'en-vivo', durationMin: 60 }), finishedAt: undefined },
  // Noviembre: afuera.
  w([2026, 10, 2, 9], 'B', [sentadilla(90, 8)], { origen: 'en-vivo', durationMin: 60 }),
]
const PRS = computeRecords(WORKOUTS, EJERCICIOS)
const OCT = rangoMes(2026, 9)
const resumen = resumenPeriodo({ workouts: WORKOUTS, exercises: EJERCICIOS, prs: PRS, ...OCT })

describe('resumenPeriodo', () => {
  it('cuenta sesiones y días del rango, sin los que no terminaron', () => {
    expect(resumen.sesiones).toBe(6)
    expect(resumen.dias).toBe(6)
    expect(resumen.series).toBe(3 + 3 + 3 + 3 + 3 + 3 + 2)
  })

  it('los minutos ignoran los cargados a mano y los cerrados solos', () => {
    expect(resumen.minutos).toBe(60 + 50 + 70)
    expect(resumen.conDuracion).toBe(3)
    expect(resumen.duracionMediana).toBe(60)
  })

  it('la franja horaria ignora los cargados a mano y los cerrados solos', () => {
    // 08:00, 08:30 → mañana; 19:30 → noche; 00:30 → mañana. El manual de las 12 y el automático de las 08:15 no cuentan.
    expect(resumen.franjaFavorita).toEqual({ franja: 'mañana', sesiones: 3, conteo: { mañana: 3, tarde: 0, noche: 1 } })
  })

  it('tonelaje sin calentamiento', () => {
    const esperado = 3 * 60 * 10 + 3 * 80 * 8 + 3 * 60 * 10 + 3 * 62.5 * 8 + 3 * 80 * 10 + 3 * 65 * 6
    expect(resumen.tonelaje).toBe(esperado)
  })

  it('favoritos: ejercicio por series, rutina por sesiones, día de la semana', () => {
    expect(resumen.ejercicioFavorito).toEqual({ exerciseId: 'banca', series: 12 })
    expect(resumen.rutinaFavorita).toEqual({ routineId: 'A', sesiones: 4 })
    // Lunes: 5, 12 y 26.
    expect(resumen.diaFavorito).toEqual({ dow: 0, sesiones: 3 })
  })

  it('la mejor semana se agrupa por lunes local', () => {
    const lunes = new Date(resumen.mejorSemana!.lunes)
    expect(lunes.getDay()).toBe(1)
    expect(lunes.getHours()).toBe(0)
    // Semana del 5: banca 3 + sentadilla 3 + banca 3 = 9.
    expect(resumen.mejorSemana).toEqual({ lunes: new Date(2026, 9, 5).getTime(), series: 9 })
  })

  it('la mayor subida compara series reales: a igual peso, las reps', () => {
    // Banca 60 × 10 → 65 × 6 es +8,3 %; sentadilla 80 × 8 → 80 × 10 es +25 %.
    expect(resumen.mayorSubida).toEqual({
      exerciseId: 'sentadilla',
      kind: 'kg',
      antes: { kg: 80, reps: 8, durationSec: undefined },
      despues: { kg: 80, reps: 10, durationSec: undefined },
      pct: 25,
    })
  })

  it('sin mejoras no hay mayor subida', () => {
    const r = resumenPeriodo({ workouts: WORKOUTS, exercises: EJERCICIOS, prs: PRS, ...rangoMes(2026, 10) })
    expect(r.mayorSubida).toBeNull()
  })

  it('los récords no incluyen la primera marca de cada ejercicio', () => {
    expect(resumen.records.map((r) => [r.exerciseId, r.marca.kg, r.marca.reps])).toEqual([
      ['sentadilla', 80, 8], // supera al 70 × 8 de septiembre
      ['banca', 62.5, 8], // supera al 60 × 10 de septiembre
      ['sentadilla', 80, 10],
      ['banca', 65, 6],
      // Dominadas: el 26 es la primera vez (8 y después 10 en la misma sesión), así que no es récord.
    ])
    const banca625 = resumen.records[1]
    expect(banca625.anterior).toEqual({ kg: 60, reps: 10, durationSec: undefined })
    expect(banca625.pct).toBeCloseTo(4.2, 1)
    expect(resumen.records[2].pct).toBe(25)
  })

  it('un período vacío da ceros y nulls', () => {
    const r = resumenPeriodo({ workouts: WORKOUTS, exercises: EJERCICIOS, prs: PRS, ...rangoMes(2026, 0) })
    expect(r).toMatchObject({
      sesiones: 0, dias: 0, minutos: 0, conDuracion: 0, duracionMediana: null, series: 0, tonelaje: 0,
      ejercicioFavorito: null, rutinaFavorita: null, diaFavorito: null, franjaFavorita: null,
      mejorSemana: null, mayorSubida: null, records: [],
    })
  })
})

describe('cambioPct', () => {
  it('kilos: cambio de peso; a igual peso, cambio de reps; tiempo y reps directos', () => {
    expect(cambioPct('kg', { kg: 130, reps: 12 }, { kg: 155, reps: 8 })).toBeCloseTo(19.2, 1)
    expect(cambioPct('kg', { kg: 60, reps: 8 }, { kg: 60, reps: 10 })).toBe(25)
    expect(cambioPct('reps', { kg: 0, reps: 8 }, { kg: 0, reps: 6 })).toBe(-25)
    expect(cambioPct('tiempo', { kg: 0, reps: 0, durationSec: 60 }, { kg: 0, reps: 0, durationSec: 90 })).toBe(50)
    expect(cambioPct('tiempo', { kg: 0, reps: 0 }, { kg: 0, reps: 0, durationSec: 90 })).toBeNull()
  })
})

describe('recordsEnRango', () => {
  it('un récord sin historial es una primera marca y no se lista', () => {
    const prs = [{ exerciseId: 'banca', kg: 80, reps: 5, date: OCT.desde + 1000 }]
    expect(recordsEnRango(prs, OCT.desde, OCT.hasta)).toEqual([])
  })

  it('dentro de un mismo entreno cuenta una sola marca, contra la de la sesión anterior', () => {
    const prs = [{
      exerciseId: 'banca', kg: 65, reps: 6, date: OCT.desde + 5000,
      history: [
        { kg: 60, reps: 10, date: OCT.desde - 1000 },
        { kg: 62.5, reps: 8, date: OCT.desde + 5000 },
      ],
    }]
    const r = recordsEnRango(prs, OCT.desde, OCT.hasta)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ marca: { kg: 65, reps: 6 }, anterior: { kg: 60, reps: 10 }, kind: 'kg' })
  })

  it('cada marca lleva la inmediatamente anterior', () => {
    const prs = [{
      exerciseId: 'cinta', kg: 0, reps: 0, durationSec: 1800, date: OCT.desde + 3000,
      history: [
        { kg: 0, reps: 0, durationSec: 1200, date: OCT.desde - 1000 },
        { kg: 0, reps: 0, durationSec: 1500, date: OCT.desde + 2000 },
      ],
    }]
    const r = recordsEnRango(prs, OCT.desde, OCT.hasta)
    expect(r.map((x) => [x.marca.durationSec, x.anterior?.durationSec, x.pct])).toEqual([[1500, 1200, 25], [1800, 1500, 20]])
    expect(r[0].kind).toBe('tiempo')
  })
})

describe('compararPeriodos', () => {
  it('da diferencia absoluta y porcentual contra la referencia', () => {
    const sep = resumenPeriodo({ workouts: WORKOUTS, exercises: EJERCICIOS, prs: PRS, ...mesAnterior(2026, 9) })
    const c = compararPeriodos(resumen, sep)
    expect(c.sesiones).toEqual({ actual: 6, referencia: 2, diferencia: 4, pct: 200 })
    expect(c.minutos).toEqual({ actual: 180, referencia: 100, diferencia: 80, pct: 80 })
    expect(c.records).toEqual({ actual: 4, referencia: 0, diferencia: 4, pct: null })
    expect(Object.keys(c).sort()).toEqual(['dias', 'minutos', 'records', 'series', 'sesiones', 'tonelaje'])
  })
})

describe('rangos de meses', () => {
  it('enero: el anterior es diciembre del año pasado', () => {
    expect(mesAnterior(2026, 0)).toEqual(rangoMes(2025, 11))
    expect(mesAnterior(2026, 0)).toMatchObject({ year: 2025, month: 11 })
    expect(mismoMesAnioAnterior(2026, 0)).toMatchObject({ year: 2025, month: 0 })
  })

  it('los bordes son la medianoche local, también en los meses con cambio de horario', () => {
    for (const mes of [2, 9]) {
      const r = rangoMes(2026, mes)
      expect(new Date(r.desde).getHours()).toBe(0)
      expect(new Date(r.hasta).getHours()).toBe(0)
      expect(new Date(r.hasta).getDate()).toBe(1)
      expect(new Date(r.hasta).getMonth()).toBe(mes + 1)
    }
  })
})
