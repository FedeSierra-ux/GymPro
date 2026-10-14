import type { Exercise, PR, Workout, WorkoutSet } from '../types'
import { lunesDe } from './program'
import { recordKindFor, type RecordKind } from './records'
import { dayKey } from './trainingDays'
import { seriesEfectivas } from './volume'

/**
 * Resumen de cualquier período [desde, hasta): un mes, un año, un ciclo.
 *
 * Las comparaciones de fuerza son entre series reales, nunca estimadas: con
 * kilos manda la serie más pesada (a igual peso, más reps), por tiempo el mejor
 * tiempo y a peso corporal las mejores reps. El calentamiento nunca cuenta.
 *
 * Acá también viven los ayudantes que comparten el informe de ciclo y el
 * resumen anual (la mejor serie, el cambio porcentual, qué duración sirve).
 */

// ---------------------------------------------------------------- Ayudantes compartidos

/** Una serie como marca: lo que se muestra ("80 kg × 8", "12 reps", "1:30 min"). */
export interface Marca {
  kg: number
  reps: number
  durationSec?: number
}

/**
 * Los cargados a mano tienen hora inventada y una duración que es lo que se
 * tardó en cargarlos; los cerrados solos, una duración fija. Ninguno sirve
 * para medir horarios ni duraciones. Los viejos (sin `origen`) sí.
 */
export function tieneHorarioReal(w: Pick<Workout, 'origen'>): boolean {
  return w.origen !== 'manual' && w.origen !== 'auto'
}

/** Minutos que se pueden creer, o null. */
export function duracionConfiable(w: Workout): number | null {
  if (!tieneHorarioReal(w)) return null
  return w.durationMin && w.durationMin > 0 ? w.durationMin : null
}

/** Valor de una serie en la unidad del ejercicio: kg, reps o segundos. */
export function valorDeMarca(kind: RecordKind, s: Marca): number {
  switch (kind) {
    case 'kg': return s.kg
    case 'reps': return s.reps
    case 'tiempo': return s.durationSec ?? 0
  }
}

/** Para elegir la mejor de dos series: con kilos manda el peso y, a igual peso, las reps. */
function puntaje(kind: RecordKind, s: Marca): number {
  return kind === 'kg' ? s.kg * 1000 + s.reps : valorDeMarca(kind, s)
}

/** true si `a` es mejor que `b` con el criterio del ejercicio. */
export function esMejorMarca(kind: RecordKind, a: Marca, b: Marca | null): boolean {
  return !b || puntaje(kind, a) > puntaje(kind, b)
}

/** Una serie que no es calentamiento ni está vacía para la unidad del ejercicio. */
function serieValida(kind: RecordKind, s: WorkoutSet): boolean {
  if (s.isWarmup) return false
  if (kind === 'kg') return s.kg > 0 && s.reps > 0
  return valorDeMarca(kind, s) > 0
}

/** La mejor serie de una lista (sin calentamiento), o null si no hay ninguna válida. */
export function mejorSerie(kind: RecordKind, sets: WorkoutSet[]): Marca | null {
  let mejor: Marca | null = null
  for (const s of sets) {
    if (!serieValida(kind, s)) continue
    const m: Marca = { kg: s.kg, reps: s.reps, durationSec: s.durationSec }
    if (esMejorMarca(kind, m, mejor)) mejor = m
  }
  return mejor
}

const redondear1 = (n: number) => Math.round(n * 10) / 10

/**
 * Cuánto cambió de `a` a `b`, en %, con series reales. Con kilos es el cambio
 * de peso; si el peso es el mismo, el cambio de reps a ese peso. null si no hay
 * contra qué comparar.
 */
export function cambioPct(kind: RecordKind, a: Marca, b: Marca): number | null {
  if (kind === 'kg') {
    if (a.kg <= 0) return null
    if (b.kg !== a.kg) return redondear1(((b.kg - a.kg) / a.kg) * 100)
    return a.reps > 0 ? redondear1(((b.reps - a.reps) / a.reps) * 100) : null
  }
  const va = valorDeMarca(kind, a)
  return va > 0 ? redondear1(((valorDeMarca(kind, b) - va) / va) * 100) : null
}

/**
 * Con qué unidad se mide cada ejercicio, mirando todas sus series terminadas
 * (el mismo criterio que los récords: así no se contradicen).
 */
export function kindsPorEjercicio(workouts: Workout[], exercises: Exercise[]): Map<string, RecordKind> {
  const porId = new Map(exercises.map((e) => [e.id, e]))
  const series = new Map<string, { kg: number }[]>()
  for (const w of workouts) {
    if (!w.finishedAt) continue
    for (const we of w.exercises) {
      const acc = series.get(we.exerciseId) ?? []
      for (const s of we.sets) if (!s.isWarmup) acc.push(s)
      series.set(we.exerciseId, acc)
    }
  }
  const out = new Map<string, RecordKind>()
  for (const [id, sets] of series) out.set(id, recordKindFor(porId.get(id), sets))
  for (const e of exercises) if (!out.has(e.id)) out.set(e.id, recordKindFor(e, []))
  return out
}

/** Si no hay series para saberlo, se deduce de la marca misma. */
function kindDeMarca(m: Marca): RecordKind {
  if (m.durationSec) return 'tiempo'
  return m.kg > 0 ? 'kg' : 'reps'
}

export function mediana(nums: number[]): number | null {
  if (nums.length === 0) return null
  const o = [...nums].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

function topDe<K>(m: Map<K, number>): [K, number] | null {
  let mejor: [K, number] | null = null
  for (const e of m) if (!mejor || e[1] > mejor[1]) mejor = e
  return mejor
}

function sumar<K>(m: Map<K, number>, k: K, n: number) {
  m.set(k, (m.get(k) ?? 0) + n)
}

/** Entrenos terminados que arrancaron en [desde, hasta), del más viejo al más nuevo. */
export function entrenosEn(workouts: Workout[], desde: number, hasta: number): Workout[] {
  return workouts
    .filter((w) => w.finishedAt && w.startedAt >= desde && w.startedAt < hasta)
    .sort((a, b) => a.startedAt - b.startedAt)
}

// ---------------------------------------------------------------- Récords del período

export interface RecordDelPeriodo {
  exerciseId: string
  kind: RecordKind
  /** Fecha del entreno en que se hizo la marca. */
  fecha: number
  marca: Marca
  /** La marca que superó. Las primeras marcas de un ejercicio no se listan, así que en la práctica siempre está. */
  anterior: Marca | null
  /** Mejora sobre la marca anterior, en %. */
  pct: number | null
}

/**
 * Las marcas que se superaron dentro de [desde, hasta), sacadas del historial
 * de cada récord. La primera vez que se hace un ejercicio no es un récord: es
 * el punto de partida.
 */
export function recordsEnRango(
  prs: PR[],
  desde: number,
  hasta: number,
  kinds: Map<string, RecordKind> = new Map(),
): RecordDelPeriodo[] {
  const out: RecordDelPeriodo[] = []
  for (const pr of prs) {
    const todas = [...(pr.history ?? []), { kg: pr.kg, reps: pr.reps, durationSec: pr.durationSec, date: pr.date }]
      .sort((a, b) => a.date - b.date)
    // computeRecords anota cada serie que supera a la anterior, también dentro
    // del mismo entreno (8 reps y después 10). Por sesión queda sólo la última,
    // que es la mejor: si no, la primera vez que se hace un ejercicio ya traía
    // un "récord", y una sesión buena contaba dos.
    const entradas = todas.filter((e, i) => i === todas.length - 1 || todas[i + 1].date !== e.date)
    const kind = kinds.get(pr.exerciseId) ?? kindDeMarca(pr)
    for (let i = 1; i < entradas.length; i++) {
      const e = entradas[i]
      if (e.date < desde || e.date >= hasta) continue
      const p = entradas[i - 1]
      const marca: Marca = { kg: e.kg, reps: e.reps, durationSec: e.durationSec }
      const anterior: Marca = { kg: p.kg, reps: p.reps, durationSec: p.durationSec }
      out.push({ exerciseId: pr.exerciseId, kind, fecha: e.date, marca, anterior, pct: cambioPct(kind, anterior, marca) })
    }
  }
  return out.sort((a, b) => a.fecha - b.fecha)
}

// ---------------------------------------------------------------- Resumen

export type Franja = 'mañana' | 'tarde' | 'noche'

/** Mañana antes de las 12, tarde de 12 a 19, noche desde las 19. */
export function franjaDe(ts: number): Franja {
  const h = new Date(ts).getHours()
  return h < 12 ? 'mañana' : h < 19 ? 'tarde' : 'noche'
}

export interface ResumenPeriodo {
  desde: number
  hasta: number
  sesiones: number
  /** Días distintos con entreno. */
  dias: number
  /** Suma de las duraciones creíbles (ni cargados a mano ni cerrados solos). */
  minutos: number
  /** Cuántos entrenos aportaron a `minutos`. */
  conDuracion: number
  duracionMediana: number | null
  /** Series efectivas. */
  series: number
  /** Σ kg × reps de las series efectivas. */
  tonelaje: number
  ejercicioFavorito: { exerciseId: string; series: number } | null
  rutinaFavorita: { routineId: string; sesiones: number } | null
  /** 0 = lunes. */
  diaFavorito: { dow: number; sesiones: number } | null
  /** Sólo con entrenos de hora real. */
  franjaFavorita: { franja: Franja; sesiones: number; conteo: Record<Franja, number> } | null
  mejorSemana: { lunes: number; series: number } | null
  /** Mejor serie de la primera sesión del período (`antes`) contra la mejor del período (`despues`). */
  mayorSubida: { exerciseId: string; kind: RecordKind; antes: Marca; despues: Marca; pct: number } | null
  records: RecordDelPeriodo[]
}

export interface ResumenPeriodoInput {
  workouts: Workout[]
  exercises: Exercise[]
  /** Los récords actuales con su historial (computeRecords). */
  prs: PR[]
  desde: number
  /** Exclusivo. */
  hasta: number
}

export function resumenPeriodo({ workouts, exercises, prs, desde, hasta }: ResumenPeriodoInput): ResumenPeriodo {
  const ws = entrenosEn(workouts, desde, hasta)
  const kinds = kindsPorEjercicio(workouts, exercises)

  const porEjercicio = new Map<string, number>()
  const porRutina = new Map<string, number>()
  const porDia = new Map<number, number>()
  const porSemana = new Map<number, number>()
  const conteo: Record<Franja, number> = { mañana: 0, tarde: 0, noche: 0 }
  const duraciones: number[] = []
  // Mejor serie de la primera sesión del período y mejor serie del período.
  const subida = new Map<string, { primera: Marca; mejor: Marca }>()
  let tonelaje = 0

  for (const w of ws) {
    sumar(porRutina, w.routineId, 1)
    sumar(porDia, (new Date(w.startedAt).getDay() + 6) % 7, 1)
    if (tieneHorarioReal(w)) conteo[franjaDe(w.startedAt)]++
    const dur = duracionConfiable(w)
    if (dur !== null) duraciones.push(dur)

    let seriesW = 0
    for (const we of w.exercises) {
      const efectivas = we.sets.filter((s) => !s.isWarmup)
      if (efectivas.length) sumar(porEjercicio, we.exerciseId, efectivas.length)
      seriesW += efectivas.length
      for (const s of efectivas) tonelaje += s.kg * s.reps

      const kind = kinds.get(we.exerciseId) ?? 'reps'
      const mejor = mejorSerie(kind, we.sets)
      if (!mejor) continue
      const acc = subida.get(we.exerciseId)
      if (!acc) subida.set(we.exerciseId, { primera: mejor, mejor })
      else if (esMejorMarca(kind, mejor, acc.mejor)) acc.mejor = mejor
    }
    sumar(porSemana, lunesDe(w.startedAt), seriesW)
  }

  let mayorSubida: ResumenPeriodo['mayorSubida'] = null
  for (const [exerciseId, { primera, mejor }] of subida) {
    const kind = kinds.get(exerciseId) ?? 'reps'
    const pct = cambioPct(kind, primera, mejor)
    if (pct !== null && pct > 0 && (!mayorSubida || pct > mayorSubida.pct)) {
      mayorSubida = { exerciseId, kind, antes: primera, despues: mejor, pct }
    }
  }

  const ej = topDe(porEjercicio)
  const ru = topDe(porRutina)
  const dia = topDe(porDia)
  const sem = topDe(porSemana)
  const franja = topDe(new Map((Object.entries(conteo) as [Franja, number][]).filter(([, n]) => n > 0)))
  const med = mediana(duraciones)

  return {
    desde,
    hasta,
    sesiones: ws.length,
    dias: new Set(ws.map((w) => dayKey(w.startedAt))).size,
    minutos: duraciones.reduce((a, b) => a + b, 0),
    conDuracion: duraciones.length,
    duracionMediana: med === null ? null : Math.round(med),
    series: seriesEfectivas(ws),
    tonelaje: Math.round(tonelaje),
    ejercicioFavorito: ej && { exerciseId: ej[0], series: ej[1] },
    rutinaFavorita: ru && { routineId: ru[0], sesiones: ru[1] },
    diaFavorito: dia && { dow: dia[0], sesiones: dia[1] },
    franjaFavorita: franja && { franja: franja[0], sesiones: franja[1], conteo },
    mejorSemana: sem && { lunes: sem[0], series: sem[1] },
    mayorSubida,
    records: recordsEnRango(prs, desde, hasta, kinds),
  }
}

// ---------------------------------------------------------------- Comparación

export interface Delta {
  actual: number
  referencia: number
  diferencia: number
  /** Cambio en %, o null si la referencia es 0. */
  pct: number | null
}

export interface ComparacionPeriodos {
  sesiones: Delta
  dias: Delta
  series: Delta
  minutos: Delta
  tonelaje: Delta
  records: Delta
}

function delta(actual: number, referencia: number): Delta {
  return {
    actual,
    referencia,
    diferencia: actual - referencia,
    pct: referencia > 0 ? Math.round(((actual - referencia) / referencia) * 100) : null,
  }
}

export function compararPeriodos(actual: ResumenPeriodo, referencia: ResumenPeriodo): ComparacionPeriodos {
  return {
    sesiones: delta(actual.sesiones, referencia.sesiones),
    dias: delta(actual.dias, referencia.dias),
    series: delta(actual.series, referencia.series),
    minutos: delta(actual.minutos, referencia.minutos),
    tonelaje: delta(actual.tonelaje, referencia.tonelaje),
    records: delta(actual.records.length, referencia.records.length),
  }
}

// ---------------------------------------------------------------- Rangos de meses

/** Un mes calendario (0-11) como rango [desde, hasta). */
export interface RangoMes {
  year: number
  month: number
  desde: number
  hasta: number
}

export function rangoMes(year: number, month: number): RangoMes {
  const d = new Date(year, month, 1)
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    desde: d.getTime(),
    hasta: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
  }
}

export function mesAnterior(year: number, month: number): RangoMes {
  return rangoMes(year, month - 1)
}

export function mismoMesAnioAnterior(year: number, month: number): RangoMes {
  return rangoMes(year - 1, month)
}
