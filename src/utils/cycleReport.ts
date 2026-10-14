import type { Exercise, Workout } from '../types'
import { SEMANA_CAMBIO, SEMANAS_PROGRAMA, semanaDelPrograma } from './program'
import { computeRecords, type RecordKind } from './records'
import {
  cambioPct, esMejorMarca, kindsPorEjercicio, mediana, mejorSerie, recordsEnRango, valorDeMarca, type Marca,
} from './periodSummary'
import { seriesEfectivas } from './volume'

/**
 * Informe de fin de ciclo del plan de 6 semanas.
 *
 * Compara series reales, no estimaciones: la mejor serie de la primera semana
 * con datos del bloque 1-3 contra la de la última semana con datos del bloque
 * 4-6. Como en la semana 4 cambian las reps (de 12 a 8, por ejemplo), además se
 * da la comparación dentro de cada bloque, que es la limpia: ahí las reps del
 * plan son las mismas al principio y al final.
 */

export interface SemanaCiclo {
  /** 1 a 6. */
  n: number
  /** Lunes 00:00 local de esa semana. */
  lunes: number
  sesiones: number
  /**
   * Sesiones planificadas que cuentan para la asistencia. Una semana que
   * todavía no empezó (o quedó afuera porque el ciclo se cortó) planifica 0;
   * la semana en curso sólo cuenta lo que ya se hizo, para no marcar como
   * falta lo que todavía se puede hacer.
   */
  planificadas: number
  /** Series efectivas. */
  series: number
}

export interface MarcaSemana extends Marca {
  semana: number
}

export interface FilaEjercicioCiclo {
  exerciseId: string
  kind: RecordKind
  /** Mejor serie de la primera semana con datos del bloque 1-3. */
  antes: MarcaSemana
  /** Mejor serie de la última semana con datos del bloque 4-6. */
  despues: MarcaSemana
  /** Cambio entre `antes` y `despues`, en %. Con kilos es el cambio de peso; a igual peso, el de reps. */
  cambioPct: number
  /** Valor de la mejor serie de cada semana (kg, reps o segundos), null si no se hizo. Para el sparkline. */
  porSemana: Array<number | null>
  /** Primera contra última semana con datos dentro de cada bloque. null si el bloque tiene una sola semana con datos. */
  dentroDeBloque: { base: number | null; alt: number | null }
}

export interface InformeCiclo {
  semanas: SemanaCiclo[]
  sesiones: number
  planificadas: number
  /** Σ min(sesiones, planificadas) / Σ planificadas, de 0 a 1. null sin plan. */
  asistencia: number | null
  series: number
  /** Récords superados dentro del ciclo (sin contar la primera vez que se hizo cada ejercicio). */
  records: number
  /** Sólo los ejercicios hechos en los dos bloques, del que más subió al que más bajó. */
  ejercicios: FilaEjercicioCiclo[]
  medianaCambio: number | null
  subieron: number
  iguales: number
  bajaron: number
  /** Semana del plan en que cae `nowTs`, si el ciclo está en curso. */
  semanaActual: number | null
}

export interface InformeCicloInput {
  workouts: Workout[]
  exercises: Exercise[]
  /** Lunes de la semana 1. */
  inicio: number
  /** Primer momento fuera del ciclo (exclusivo): finDeCiclo(inicio), o antes si se cortó. */
  fin: number
  /** Sesiones planificadas en la semana que arranca ese lunes (ya contando sólo desde el primer uso). */
  planificadasEnSemana: (lunesTs: number) => number
  /** Para saber si el ciclo está en curso. */
  nowTs?: number
}

/** Lunes de la semana `n` del ciclo, con aritmética de fechas (el cambio de horario no lo corre). */
function lunesDeSemana(inicio: number, n: number): number {
  const d = new Date(inicio)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (n - 1) * 7).getTime()
}

/** Primera y última semana con datos dentro de [desde, hasta]. */
function extremos(semanas: number[], desde: number, hasta: number): [number, number] | null {
  const en = semanas.filter((n) => n >= desde && n <= hasta)
  return en.length ? [en[0], en[en.length - 1]] : null
}

export function informeCiclo({
  workouts, exercises, inicio, fin, planificadasEnSemana, nowTs,
}: InformeCicloInput): InformeCiclo {
  const hastaFin = workouts.filter((w) => w.finishedAt && w.startedAt < fin)
  const kinds = kindsPorEjercicio(hastaFin, exercises)

  const semanaDe = (w: Workout) => w.semanaPrograma ?? semanaDelPrograma(inicio, w.startedAt)
  const enCiclo = hastaFin.filter((w) => {
    if (w.startedAt < inicio) return false
    const n = semanaDe(w)
    return n >= 1 && n <= SEMANAS_PROGRAMA
  })

  // Hasta dónde se puede exigir el plan: el fin del ciclo, o ahora si sigue en curso.
  const corte = Math.min(fin, nowTs ?? Infinity)

  const semanas: SemanaCiclo[] = []
  let hechas = 0
  for (let n = 1; n <= SEMANAS_PROGRAMA; n++) {
    const lunes = lunesDeSemana(inicio, n)
    const proximo = lunesDeSemana(inicio, n + 1)
    const deLaSemana = enCiclo.filter((w) => semanaDe(w) === n)
    const sesiones = deLaSemana.length
    let planificadas = 0
    if (lunes < corte) {
      const plan = Math.max(0, planificadasEnSemana(lunes))
      planificadas = proximo <= corte ? plan : Math.min(plan, sesiones)
    }
    hechas += Math.min(sesiones, planificadas)
    semanas.push({ n, lunes, sesiones, planificadas, series: seriesEfectivas(deLaSemana) })
  }
  const planificadas = semanas.reduce((a, s) => a + s.planificadas, 0)

  // Mejor serie de cada ejercicio en cada semana.
  const mejores = new Map<string, Map<number, Marca>>()
  for (const w of enCiclo) {
    const n = semanaDe(w)
    for (const we of w.exercises) {
      const kind = kinds.get(we.exerciseId) ?? 'reps'
      const mejor = mejorSerie(kind, we.sets)
      if (!mejor) continue
      const porSemana = mejores.get(we.exerciseId) ?? new Map<number, Marca>()
      if (esMejorMarca(kind, mejor, porSemana.get(n) ?? null)) porSemana.set(n, mejor)
      mejores.set(we.exerciseId, porSemana)
    }
  }

  const ejercicios: FilaEjercicioCiclo[] = []
  for (const [exerciseId, porSemana] of mejores) {
    const kind = kinds.get(exerciseId) ?? 'reps'
    const conDatos = [...porSemana.keys()].sort((a, b) => a - b)
    const base = extremos(conDatos, 1, SEMANA_CAMBIO - 1)
    const alt = extremos(conDatos, SEMANA_CAMBIO, SEMANAS_PROGRAMA)
    if (!base || !alt) continue
    const antes = porSemana.get(base[0])!
    const despues = porSemana.get(alt[1])!
    const cambio = cambioPct(kind, antes, despues)
    if (cambio === null) continue
    const dentro = ([a, b]: [number, number]) => (a === b ? null : cambioPct(kind, porSemana.get(a)!, porSemana.get(b)!))
    ejercicios.push({
      exerciseId,
      kind,
      antes: { ...antes, semana: base[0] },
      despues: { ...despues, semana: alt[1] },
      cambioPct: cambio,
      porSemana: Array.from({ length: SEMANAS_PROGRAMA }, (_, i) => {
        const m = porSemana.get(i + 1)
        return m ? valorDeMarca(kind, m) : null
      }),
      dentroDeBloque: { base: dentro(base), alt: dentro(alt) },
    })
  }
  ejercicios.sort((a, b) => b.cambioPct - a.cambioPct)

  const cambios = ejercicios.map((e) => e.cambioPct)
  const med = mediana(cambios)
  const records = recordsEnRango(computeRecords(hastaFin, exercises), inicio, fin, kinds).length

  let semanaActual: number | null = null
  if (nowTs !== undefined && nowTs >= inicio && nowTs < fin) {
    const n = semanaDelPrograma(inicio, nowTs)
    if (n >= 1 && n <= SEMANAS_PROGRAMA) semanaActual = n
  }

  return {
    semanas,
    sesiones: enCiclo.length,
    planificadas,
    asistencia: planificadas > 0 ? hechas / planificadas : null,
    series: seriesEfectivas(enCiclo),
    records,
    ejercicios,
    medianaCambio: med === null ? null : Math.round(med * 10) / 10,
    subieron: cambios.filter((c) => c > 0).length,
    iguales: cambios.filter((c) => c === 0).length,
    bajaron: cambios.filter((c) => c < 0).length,
    semanaActual,
  }
}
