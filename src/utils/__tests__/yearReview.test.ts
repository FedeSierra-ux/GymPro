import { describe, expect, it } from 'vitest'
import type { BodyMeasure, Workout } from '../../types'
import { finDeCiclo, lunesDe } from '../program'
import { computeRecords } from '../records'
import { equivalenciaToneladas, resumenAnual, wrappedDisponible } from '../yearReview'
import { ejercicio, serie } from './helpers'

function fecha(y: number, m: number, d: number, h = 0, min = 0): number {
  return new Date(y, m, d, h, min).getTime()
}

let n = 0
function w(startedAt: number, routineId: string, exercises: Workout['exercises'], extra: Partial<Workout> = {}): Workout {
  return { id: `w${n++}`, routineId, startedAt, finishedAt: startedAt + 3600000, durationMin: 60, origen: 'en-vivo', exercises, ...extra }
}

const EJERCICIOS = [
  ejercicio('banca'),
  ejercicio('sentadilla', { muscleGroup: 'piernas' }),
  ejercicio('dominadas', { muscleGroup: 'espalda', equipmentType: 'peso_corporal' }),
]

/**
 * Empezó a usar la app el martes 14 de octubre de 2025. Martes: banca (sube
 * 2,5 kg cada dos semanas) y dominadas (una rep más por semana). Jueves:
 * sentadilla. La semana del 10 de noviembre no fue; el sábado 29 de noviembre
 * hizo una de más.
 */
const INICIO_USO = fecha(2025, 9, 14, 10)
const PRIMER_LUNES = lunesDe(INICIO_USO)
function semanaK(k: number, dia: number, hora: number): number {
  const l = new Date(PRIMER_LUNES)
  return new Date(l.getFullYear(), l.getMonth(), l.getDate() + k * 7 + dia, hora).getTime()
}
function desdeOctubre(): Workout[] {
  const ws: Workout[] = []
  for (let k = 0; k < 10; k++) {
    if (k === 4) continue
    ws.push(w(semanaK(k, 1, 19), 'torso', [
      { exerciseId: 'banca', sets: [serie(40, 10, { isWarmup: true }), ...Array.from({ length: 4 }, () => serie(60 + 2.5 * Math.floor(k / 2), 8))] },
      { exerciseId: 'dominadas', sets: [serie(0, 5 + k), serie(0, 4 + k), serie(0, 3 + k)] },
    ]))
    ws.push(w(semanaK(k, 3, 8), 'piernas', [{ exerciseId: 'sentadilla', sets: [serie(80, 8), serie(80, 8), serie(80, 8)] }]))
  }
  ws.push(w(fecha(2025, 10, 29, 11), 'piernas', [{ exerciseId: 'sentadilla', sets: [serie(80, 8), serie(80, 8), serie(80, 8)] }]))
  return ws
}

const MEDIDAS: BodyMeasure[] = [
  { id: 'm0', date: fecha(2025, 8, 1, 12), weightKg: 85 }, // antes de empezar: no cuenta
  { id: 'm1', date: fecha(2025, 9, 15, 12), weightKg: 80, cintura: 90 },
  { id: 'm2', date: fecha(2025, 10, 15, 12), weightKg: 79 },
  { id: 'm3', date: fecha(2025, 11, 15, 12), weightKg: 78.2, cintura: 87.5 },
]

const NOW = fecha(2025, 11, 20, 12)

describe('resumenAnual de alguien que empezó en octubre', () => {
  const workouts = desdeOctubre()
  const prs = computeRecords(workouts, EJERCICIOS)
  const ciclos = [
    { inicio: fecha(2025, 3, 7), fin: finDeCiclo(fecha(2025, 3, 7)) }, // de antes: no cuenta
    { inicio: fecha(2025, 9, 20), fin: finDeCiclo(fecha(2025, 9, 20)) }, // termina el 1 de diciembre
    { inicio: fecha(2025, 11, 8), fin: finDeCiclo(fecha(2025, 11, 8)) }, // en curso
  ]
  const r = resumenAnual({
    workouts, exercises: EJERCICIOS, prs, measures: MEDIDAS, ciclos, inicioUso: INICIO_USO, year: 2025, nowTs: NOW,
  })

  it('el período arranca el día que empezó, a las 00:00, y termina ahora', () => {
    expect(r.desde).toBe(fecha(2025, 9, 14))
    expect(r.hasta).toBe(NOW)
    expect(r.empezoEsteAnio).toBe(true)
    // 14 al 31 de octubre (18) + noviembre (30) + 1 al 20 de diciembre (20).
    expect(r.diasDeUso).toBe(68)
  })

  it('trae los campos del resumen del período', () => {
    expect(r.sesiones).toBe(19)
    expect(r.dias).toBe(19)
    expect(r.ejercicioFavorito).toEqual({ exerciseId: 'banca', series: 36 })
    // Jueves 08:00 y el sábado 11:00 (10) contra martes 19:00 (9).
    expect(r.franjaFavorita).toMatchObject({ franja: 'mañana', sesiones: 10, conteo: { mañana: 10, tarde: 0, noche: 9 } })
  })

  it('el ejercicio del año es el de más récords, no el de más series', () => {
    // Dominadas: 8 récords (la primera vez no cuenta). Banca: 62,5, 65, 67,5 y 70.
    expect(r.recordsTotal).toBe(12)
    expect(r.ejercicioDelAnio).toEqual({ exerciseId: 'dominadas', series: 27, records: 8 })
  })

  it('los tres récords que más superaron la marca anterior', () => {
    // 8 → 10 reps (se salteó una semana) es +25 %; 5 → 6, +20 %; 6 → 7, +16,7 %.
    expect(r.topRecords.map((x) => x.pct)).toEqual([25, 20, 16.7])
    expect(r.topRecords.every((x) => x.exerciseId === 'dominadas')).toBe(true)
  })

  it('mes más fuerte, racha de semanas y ciclos', () => {
    // Noviembre: 3 martes × 7 series + 3 jueves y el sábado × 3. Octubre y diciembre: 30.
    expect(r.mesMasFuerte).toEqual({ year: 2025, month: 10, series: 3 * 7 + 4 * 3 })
    // Del 13/10 al 3/11 son 4 semanas; la del 10/11 no fue; del 17/11 al 15/12 son 5.
    expect(r.mejorRachaSemanas).toBe(5)
    expect(r.ciclosCompletados).toBe(1)
  })

  it('cuerpo: primera contra última medición del período', () => {
    expect(r.cuerpo).toEqual({
      weightKg: { desde: 80, hasta: 78.2, cambio: -1.8 },
      cintura: { desde: 90, hasta: 87.5, cambio: -2.5 },
    })
  })

  it('las toneladas vienen con una equivalencia', () => {
    expect(r.toneladas).toEqual(equivalenciaToneladas(r.tonelaje))
    expect(r.toneladas!.cantidad).toBeGreaterThanOrEqual(2)
    expect(r.toneladas!.cantidad).toBeLessThanOrEqual(200)
  })

  it('sin entrenos el año anterior no hay comparación', () => {
    expect(r.anioAnterior).toBeNull()
  })

  it('un entreno cargado de antes del primer uso corre el inicio', () => {
    const conViejo = [...workouts, w(fecha(2025, 8, 1, 18), 'torso', [{ exerciseId: 'banca', sets: [serie(55, 8)] }], { origen: 'manual' })]
    const r2 = resumenAnual({
      workouts: conViejo, exercises: EJERCICIOS, prs: computeRecords(conViejo, EJERCICIOS), measures: MEDIDAS, ciclos: [],
      inicioUso: INICIO_USO, year: 2025, nowTs: NOW,
    })
    expect(r2.desde).toBe(fecha(2025, 8, 1))
    expect(r2.sesiones).toBe(20)
    // El cargado a mano no aporta minutos.
    expect(r2.minutos).toBe(r.minutos)
    // Ahora la medición de septiembre entra.
    expect(r2.cuerpo?.weightKg).toEqual({ desde: 85, hasta: 78.2, cambio: -6.8 })
  })
})

describe('resumenAnual de alguien que viene de antes', () => {
  // 2024: un entreno por semana. 2025: dos.
  const workouts: Workout[] = []
  for (let d = new Date(2024, 0, 1); d.getFullYear() < 2026; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const dow = d.getDay()
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18).getTime()
    if (ts > NOW) break
    if (dow === 1 || (d.getFullYear() === 2025 && dow === 4)) {
      workouts.push(w(ts, 'full', [{ exerciseId: 'sentadilla', sets: [serie(80, 8), serie(80, 8)] }]))
    }
  }
  const prs = computeRecords(workouts, EJERCICIOS)
  const r = resumenAnual({
    workouts, exercises: EJERCICIOS, prs, measures: [], ciclos: [], inicioUso: fecha(2024, 0, 1, 9), year: 2025, nowTs: NOW,
  })

  it('el período es el año desde el 1 de enero', () => {
    expect(r.desde).toBe(fecha(2025, 0, 1))
    expect(r.empezoEsteAnio).toBe(false)
    expect(r.diasDeUso).toBe(354)
    expect(r.cuerpo).toBeNull()
  })

  it('compara contra el mismo tramo del año anterior', () => {
    const en2025 = workouts.filter((x) => x.startedAt >= fecha(2025, 0, 1)).length
    const en2024 = workouts.filter((x) => x.startedAt < fecha(2024, 11, 20, 12)).length
    expect(r.anioAnterior?.sesiones).toEqual({
      actual: en2025, referencia: en2024, diferencia: en2025 - en2024, pct: Math.round(((en2025 - en2024) / en2024) * 100),
    })
    expect(r.anioAnterior?.series.actual).toBe(en2025 * 2)
  })

  it('la racha de semanas atraviesa los cambios de horario', () => {
    // Todas las semanas del 2025 hasta el 20/12 tienen entreno: del 29/12/2024 (lunes 30) al 15/12.
    const lunes = new Set<number>()
    for (const x of workouts) if (x.startedAt >= r.desde) lunes.add(lunesDe(x.startedAt))
    expect(r.mejorRachaSemanas).toBe(lunes.size)
    expect(r.mejorRachaSemanas).toBe(51)
  })
})

describe('equivalenciaToneladas', () => {
  it('elige la primera cosa que da entre 2 y 200', () => {
    expect(equivalenciaToneladas(50000)).toEqual({ total: 50, cantidad: 8.3, cosa: 'elefantes' })
    expect(equivalenciaToneladas(5000)).toEqual({ total: 5, cantidad: 3.3, cosa: 'autos' })
    expect(equivalenciaToneladas(2000)).toEqual({ total: 2, cantidad: 4, cosa: 'pianos de cola' })
    expect(equivalenciaToneladas(1500000)).toEqual({ total: 1500, cantidad: 10, cosa: 'ballenas azules' })
  })

  it('fuera de rango usa la más chica o la más grande; sin tonelaje, null', () => {
    expect(equivalenciaToneladas(600)?.cosa).toBe('pianos de cola')
    expect(equivalenciaToneladas(600)?.cantidad).toBe(1.2)
    expect(equivalenciaToneladas(60_000_000)?.cosa).toBe('ballenas azules')
    expect(equivalenciaToneladas(0)).toBeNull()
  })
})

describe('wrappedDisponible', () => {
  const diez = Array.from({ length: 10 }, (_, i) => w(fecha(2025, 9, 14 + i * 3, 19), 'full', [{ exerciseId: 'banca', sets: [serie(60, 8)] }]))
  const disponible = (workouts: Workout[], nowTs: number) => wrappedDisponible({ workouts, inicioUso: INICIO_USO, nowTs })

  it('del 1 de diciembre al 15 de enero ofrece el año que termina', () => {
    expect(disponible(diez, fecha(2025, 10, 30, 23, 59))).toBeNull()
    expect(disponible(diez, fecha(2025, 11, 1, 0, 30))).toBe(2025)
    expect(disponible(diez, fecha(2025, 11, 31, 23, 0))).toBe(2025)
    expect(disponible(diez, fecha(2026, 0, 1, 10))).toBe(2025)
    expect(disponible(diez, fecha(2026, 0, 15, 22))).toBe(2025)
    expect(disponible(diez, fecha(2026, 0, 16, 0, 30))).toBeNull()
    expect(disponible(diez, fecha(2025, 6, 1))).toBeNull()
  })

  it('pide al menos 8 entrenos terminados en ese año', () => {
    const siete = diez.slice(0, 7)
    expect(disponible(siete, fecha(2025, 11, 10))).toBeNull()
    const sinTerminar = [...siete, { ...diez[7], finishedAt: undefined }]
    expect(disponible(sinTerminar, fecha(2025, 11, 10))).toBeNull()
    expect(disponible(diez.slice(0, 8), fecha(2025, 11, 10))).toBe(2025)
  })

  it('en enero no cuentan los entrenos del año nuevo', () => {
    const delAnioNuevo = Array.from({ length: 8 }, (_, i) => w(fecha(2026, 0, 1 + i, 19), 'full', []))
    expect(disponible(delAnioNuevo, fecha(2026, 0, 12))).toBeNull()
  })
})
