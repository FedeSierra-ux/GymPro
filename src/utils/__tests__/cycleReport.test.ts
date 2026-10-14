import { describe, expect, it } from 'vitest'
import type { Workout } from '../../types'
import { informeCiclo } from '../cycleReport'
import { finDeCiclo, lunesDe } from '../program'
import { ejercicio, serie } from './helpers'

/** Fecha local: el lunes `lunes` + `dias`, a la hora indicada (aritmética de fechas, no de milisegundos). */
function el(lunes: number, dias: number, hora = 18, min = 0): number {
  const d = new Date(lunes)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, hora, min).getTime()
}

let n = 0
function w(startedAt: number, exercises: Workout['exercises'], extra: Partial<Workout> = {}): Workout {
  return { id: `w${n++}`, routineId: 'r1', startedAt, finishedAt: startedAt + 3600000, durationMin: 60, exercises, ...extra }
}

const EJERCICIOS = [
  ejercicio('prensa', { muscleGroup: 'piernas', equipmentType: 'maquina' }),
  ejercicio('banca'),
  ejercicio('dominadas', { muscleGroup: 'espalda', equipmentType: 'peso_corporal' }),
  ejercicio('plancha', { muscleGroup: 'core', trackingType: 'duration', durationUnit: 'seg' }),
  ejercicio('vuelos', { muscleGroup: 'hombros', equipmentType: 'mancuernas' }),
]

// Lunes 5 de octubre de 2026. En Madrid el horario cambia el domingo 25: la
// semana 4 arranca justo después.
const INICIO = lunesDe(new Date(2026, 9, 7).getTime())
const FIN = finDeCiclo(INICIO)
const semana = (k: number) => el(INICIO, (k - 1) * 7, 0)

// Plan de Mile: semanas 1-3 a 12 reps, 4-6 a 8 reps con más peso.
const PRENSA = [130, 135, 140, 145, 150, 155]
const REPS = [12, 12, 12, 8, 8, 8]
const BANCA = [[60, 12], [60, 12], [60, 12], [60, 8], [60, 9], [60, 10]]
const DOMINADAS = [6, 7, 7, 8, 8, 9]
const PLANCHA = [30, 35, 40, 40, 45, 45]

function cicloCompleto(): Workout[] {
  const ws: Workout[] = [
    // Antes del ciclo: la primera prensa de la historia.
    w(el(INICIO, -7), [{ exerciseId: 'prensa', sets: [serie(120, 12)] }]),
  ]
  for (let k = 1; k <= 6; k++) {
    const i = k - 1
    const lunes = semana(k)
    ws.push(w(el(lunes, 0, 18), [
      {
        exerciseId: 'prensa',
        sets: [
          serie(60, 10, { isWarmup: true }),
          // Una serie de calentamiento pesadísima no es la mejor serie.
          ...(k === 6 ? [serie(200, 1, { isWarmup: true })] : []),
          serie(PRENSA[i], REPS[i]), serie(PRENSA[i], REPS[i]), serie(PRENSA[i], REPS[i] - 1),
        ],
      },
      { exerciseId: 'plancha', sets: [serie(0, 0, { durationSec: PLANCHA[i] }), serie(0, 0, { durationSec: PLANCHA[i] - 5 })] },
    ]))
    // El miércoles de la semana 5 faltó.
    if (k !== 5) {
      ws.push(w(el(lunes, 2, 19), [
        { exerciseId: 'banca', sets: [serie(BANCA[i][0], BANCA[i][1]), serie(BANCA[i][0], BANCA[i][1]), serie(BANCA[i][0], BANCA[i][1] - 2)] },
        { exerciseId: 'dominadas', sets: [serie(0, DOMINADAS[i]), serie(0, DOMINADAS[i] - 1), serie(0, DOMINADAS[i] - 2)] },
        ...(k <= 3 ? [{ exerciseId: 'vuelos', sets: [serie(8, 15), serie(8, 15), serie(8, 15)] }] : []),
      ]))
    }
  }
  // Un viernes de más en la semana 2.
  ws.push(w(el(semana(2), 4, 9), [{ exerciseId: 'vuelos', sets: [serie(8, 15), serie(8, 15)] }]))
  // Sin terminar: no cuenta.
  ws.push({ ...w(el(semana(3), 3), [{ exerciseId: 'prensa', sets: [serie(300, 12)] }]), finishedAt: undefined })
  // Después del ciclo: tampoco.
  ws.push(w(el(FIN, 0), [{ exerciseId: 'prensa', sets: [serie(170, 8)] }]))
  return ws
}

describe('informeCiclo', () => {
  const informe = informeCiclo({
    workouts: cicloCompleto(),
    exercises: EJERCICIOS,
    inicio: INICIO,
    fin: FIN,
    planificadasEnSemana: () => 2,
  })

  it('arma las 6 semanas con lunes reales a las 00:00, aunque cambie el horario', () => {
    expect(informe.semanas).toHaveLength(6)
    informe.semanas.forEach((s, i) => {
      const d = new Date(s.lunes)
      expect(s.n).toBe(i + 1)
      expect(d.getDay()).toBe(1)
      expect(d.getHours()).toBe(0)
      expect(s.lunes).toBe(semana(i + 1))
    })
  })

  it('cuenta sesiones, planificadas y asistencia sin premiar las sesiones de más', () => {
    expect(informe.semanas.map((s) => s.sesiones)).toEqual([2, 3, 2, 2, 1, 2])
    expect(informe.sesiones).toBe(12)
    expect(informe.planificadas).toBe(12)
    // La semana 2 tuvo 3 pero cuenta 2; a la 5 le faltó una.
    expect(informe.asistencia).toBeCloseTo(11 / 12)
  })

  it('cuenta series efectivas, sin calentamiento', () => {
    // Lunes: prensa 3 + plancha 2. Miércoles: banca 3 + dominadas 3 + vuelos 3.
    expect(informe.semanas[0].series).toBe(14)
    expect(informe.series).toBe(informe.semanas.reduce((a, s) => a + s.series, 0))
  })

  it('el cambio de 12 a 8 reps en la semana 4 se sigue leyendo como progreso', () => {
    const prensa = informe.ejercicios.find((e) => e.exerciseId === 'prensa')!
    expect(prensa.kind).toBe('kg')
    expect(prensa.antes).toEqual({ kg: 130, reps: 12, durationSec: undefined, semana: 1 })
    // 155 × 8 contra 130 × 12: manda el peso.
    expect(prensa.despues).toEqual({ kg: 155, reps: 8, durationSec: undefined, semana: 6 })
    expect(prensa.cambioPct).toBeCloseTo(19.2, 1)
    expect(prensa.dentroDeBloque.base).toBeCloseTo(7.7, 1)
    expect(prensa.dentroDeBloque.alt).toBeCloseTo(6.9, 1)
    expect(prensa.porSemana).toEqual(PRENSA)
  })

  it('a igual peso compara reps, y dentro del bloque se ve la mejora que el cruce de bloques esconde', () => {
    const banca = informe.ejercicios.find((e) => e.exerciseId === 'banca')!
    // 60 × 12 → 60 × 10: entre bloques baja, porque el plan pide menos reps...
    expect(banca.cambioPct).toBeCloseTo(-16.7, 1)
    // ...pero dentro del bloque 4-6 pasó de 8 a 10 a 60 kg.
    expect(banca.dentroDeBloque).toEqual({ base: 0, alt: 25 })
    expect(banca.porSemana).toEqual([60, 60, 60, 60, null, 60])
  })

  it('a peso corporal mide reps y por tiempo mide segundos', () => {
    const dominadas = informe.ejercicios.find((e) => e.exerciseId === 'dominadas')!
    expect(dominadas.kind).toBe('reps')
    expect(dominadas.cambioPct).toBe(50)
    expect(dominadas.porSemana).toEqual([6, 7, 7, 8, null, 9])
    const plancha = informe.ejercicios.find((e) => e.exerciseId === 'plancha')!
    expect(plancha.kind).toBe('tiempo')
    expect(plancha.antes.durationSec).toBe(30)
    expect(plancha.despues.durationSec).toBe(45)
    expect(plancha.cambioPct).toBe(50)
    expect(plancha.dentroDeBloque.base).toBeCloseTo(33.3, 1)
    expect(plancha.dentroDeBloque.alt).toBe(12.5)
  })

  it('sólo lista los ejercicios hechos en los dos bloques, del que más subió al que más bajó', () => {
    expect(informe.ejercicios.map((e) => e.exerciseId).sort()).toEqual(['banca', 'dominadas', 'plancha', 'prensa'])
    const cambios = informe.ejercicios.map((e) => e.cambioPct)
    expect(cambios).toEqual([...cambios].sort((a, b) => b - a))
    expect(informe.subieron).toBe(3)
    expect(informe.iguales).toBe(0)
    expect(informe.bajaron).toBe(1)
    // [50, 50, 19.2, -16.7] → (50 + 19.2) / 2
    expect(informe.medianaCambio).toBeCloseTo(34.6, 1)
  })

  it('los récords no cuentan la primera vez que se hace un ejercicio', () => {
    // Prensa: 6 (la primera fue antes del ciclo). Banca y vuelos: 0 (la semana 1 es la primera vez).
    // Dominadas: 7, 8, 9. Plancha: 35, 40, 45.
    expect(informe.records).toBe(12)
  })

  it('sin nowTs no hay semana actual', () => {
    expect(informe.semanaActual).toBeNull()
  })
})

describe('informeCiclo en curso o cortado', () => {
  it('no exige el plan de las semanas que no empezaron ni lo que queda de la actual', () => {
    const nowTs = el(semana(3), 2, 10) // miércoles de la semana 3, antes del entreno de la tarde
    const ws = cicloCompleto().filter((x) => x.startedAt < nowTs)
    const informe = informeCiclo({
      workouts: ws, exercises: EJERCICIOS, inicio: INICIO, fin: FIN, planificadasEnSemana: () => 2, nowTs,
    })
    expect(informe.semanaActual).toBe(3)
    expect(informe.semanas.map((s) => s.planificadas)).toEqual([2, 2, 1, 0, 0, 0])
    expect(informe.asistencia).toBe(1)
    // Todavía no hay bloque 4-6: no hay filas para comparar.
    expect(informe.ejercicios).toEqual([])
    expect(informe.medianaCambio).toBeNull()
  })

  it('un ciclo cortado en la semana 4 deja afuera lo de después', () => {
    const fin = el(semana(4), 3, 0) // jueves de la semana 4
    const informe = informeCiclo({
      workouts: cicloCompleto(), exercises: EJERCICIOS, inicio: INICIO, fin, planificadasEnSemana: () => 2,
    })
    expect(informe.semanas.map((s) => s.sesiones)).toEqual([2, 3, 2, 2, 0, 0])
    expect(informe.semanas.map((s) => s.planificadas)).toEqual([2, 2, 2, 2, 0, 0])
    const prensa = informe.ejercicios.find((e) => e.exerciseId === 'prensa')!
    expect(prensa.despues).toMatchObject({ kg: 145, reps: 8, semana: 4 })
    expect(prensa.dentroDeBloque.alt).toBeNull()
  })

  it('sin plan la asistencia es null', () => {
    const informe = informeCiclo({
      workouts: cicloCompleto(), exercises: EJERCICIOS, inicio: INICIO, fin: FIN, planificadasEnSemana: () => 0,
    })
    expect(informe.asistencia).toBeNull()
  })

  it('usa la semana guardada en el entreno antes que la fecha', () => {
    const domingo = el(semana(3), 6, 20)
    const ws = [w(domingo, [{ exerciseId: 'banca', sets: [serie(60, 8)] }], { semanaPrograma: 4 })]
    const informe = informeCiclo({ workouts: ws, exercises: EJERCICIOS, inicio: INICIO, fin: FIN, planificadasEnSemana: () => 2 })
    expect(informe.semanas[2].sesiones).toBe(0)
    expect(informe.semanas[3].sesiones).toBe(1)
  })
})

describe('informeCiclo y el cambio de horario', () => {
  // Madrid: el horario cambia el último domingo de marzo y de octubre.
  for (const [nombre, referencia] of [['marzo', new Date(2026, 2, 25)], ['octubre', new Date(2026, 9, 21)]] as const) {
    it(`el domingo a la noche y el lunes a la madrugada caen en semanas distintas (${nombre})`, () => {
      const inicio = lunesDe(referencia.getTime())
      const domingo = el(inicio, 6, 23, 30) // el domingo del cambio
      const lunes = el(inicio, 7, 0, 30)
      const ultimoDomingo = el(inicio, 41, 23, 30)
      const ws = [
        w(domingo, [{ exerciseId: 'banca', sets: [serie(60, 10)] }]),
        w(lunes, [{ exerciseId: 'banca', sets: [serie(60, 10)] }]),
        w(ultimoDomingo, [{ exerciseId: 'banca', sets: [serie(60, 10)] }]),
        w(finDeCiclo(inicio) + 30 * 60000, [{ exerciseId: 'banca', sets: [serie(60, 10)] }]),
      ]
      const informe = informeCiclo({
        workouts: ws, exercises: EJERCICIOS, inicio, fin: finDeCiclo(inicio), planificadasEnSemana: () => 1,
      })
      expect(informe.semanas.map((s) => s.sesiones)).toEqual([1, 1, 0, 0, 0, 1])
      for (const s of informe.semanas) {
        expect(new Date(s.lunes).getDay()).toBe(1)
        expect(new Date(s.lunes).getHours()).toBe(0)
      }
    })
  }
})
