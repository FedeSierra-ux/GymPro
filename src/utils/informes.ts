import type { Routine, Workout } from '../types'
import type { FilaEjercicioCiclo } from './cycleReport'
import { formatDuration } from './duration'
import { formatKg } from './format'
import type { Marca } from './periodSummary'
import { finDeCiclo, semanaDelPrograma, SEMANAS_PROGRAMA, type CicloPrograma, type ProgramaEstado } from './program'
import type { RecordKind } from './records'
import { inicioDeFaltas, plannedDowSet } from './trainingDays'
import { planDeSemana, type WeekOverrides, type WeekPlan } from './weekPlan'
import type { ResumenAnual } from './yearReview'

/**
 * Lo que necesitan las pantallas de informes y no es React: textos, rangos de
 * fechas y qué mostrar. Separado para poder probarlo.
 */

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** 0 = lunes. */
export const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// ---------------------------------------------------------------- Fechas

function sumarDias(ts: number, dias: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias).getTime()
}

/** "14 de octubre". */
export function fechaLarga(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** "13/9 – 24/10": del lunes de la semana 1 al último día (el fin es exclusivo). */
export function rangoCiclo(inicio: number, fin: number): string {
  const a = new Date(inicio)
  const b = new Date(sumarDias(fin, -1))
  return `${a.getDate()}/${a.getMonth() + 1} – ${b.getDate()}/${b.getMonth() + 1}`
}

export function claveMes(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** La tarjeta del mes pasado se ofrece del 1 al 7 de cada mes. */
export function mesDeLaTarjeta(nowTs: number): { year: number; month: number } | null {
  const hoy = new Date(nowTs)
  if (hoy.getDate() > 7) return null
  const m = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  return { year: m.getFullYear(), month: m.getMonth() }
}

export type ModoComparacion = 'anterior' | 'anioPasado'

export interface RangosComparacion {
  actual: { desde: number; hasta: number }
  referencia: { desde: number; hasta: number }
  /** El mes está en curso: la referencia se corta en el mismo día del mes. */
  parcial: boolean
  /** "septiembre", "octubre 2025" o "1–14 sep". */
  etiqueta: string
}

/**
 * Contra qué se compara un mes. Si el mes está en curso, la referencia se
 * corta en el mismo día: comparar 14 días de octubre con septiembre entero
 * daba siempre "bajaste".
 */
export function rangosParaComparar(year: number, month: number, modo: ModoComparacion, nowTs: number): RangosComparacion {
  const desde = new Date(year, month, 1).getTime()
  const hasta = new Date(year, month + 1, 1).getTime()
  const ref = modo === 'anterior' ? new Date(year, month - 1, 1) : new Date(year - 1, month, 1)
  const refDesde = ref.getTime()
  const refFin = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime()
  const parcial = nowTs >= desde && nowTs < hasta
  const dia = new Date(nowTs).getDate()
  const refHasta = parcial ? Math.min(refFin, new Date(ref.getFullYear(), ref.getMonth(), dia + 1).getTime()) : refFin
  const nombre = modo === 'anterior' ? MESES[ref.getMonth()] : `${MESES[ref.getMonth()]} ${ref.getFullYear()}`
  const ultimoDia = new Date(refHasta - 1).getDate()
  const etiqueta = parcial
    ? `${ultimoDia === 1 ? '1' : `1–${ultimoDia}`} ${MESES_CORTOS[ref.getMonth()]}${modo === 'anioPasado' ? ` ${ref.getFullYear()}` : ''}`
    : nombre
  return { actual: { desde, hasta }, referencia: { desde: refDesde, hasta: refHasta }, parcial, etiqueta }
}

// ---------------------------------------------------------------- Plan

/**
 * Sesiones planificadas en la semana que arranca en `lunes`: la meta semanal si
 * hay una, y si no los días con rutina de esa semana. Los días anteriores al
 * primer uso no cuentan.
 */
export function planificadasPorSemana({ weekPlan, weekOverrides, weeklyGoal, routines, inicioUso, workouts }: {
  weekPlan: WeekPlan
  weekOverrides: WeekOverrides
  weeklyGoal: number | null
  routines: Pick<Routine, 'id'>[]
  inicioUso: number | null
  workouts: Workout[]
}): (lunes: number) => number {
  const desde = inicioDeFaltas(inicioUso, workouts)
  const ids = routines.map((r) => r.id)
  return (lunes) => {
    if (weeklyGoal != null) return desde != null && sumarDias(lunes, 7) <= desde ? 0 : weeklyGoal
    const dows = plannedDowSet(planDeSemana(weekPlan, weekOverrides, lunes), ids)
    return [...dows].filter((dow) => desde == null || sumarDias(lunes, dow) >= desde).length
  }
}

export interface CicloListado extends CicloPrograma {
  enCurso: boolean
  /** Semana actual, para el que está en curso. */
  semana: number | null
}

/** El ciclo en curso (o el que terminó y todavía no se cerró) y los pasados, del más nuevo al más viejo. */
export function ciclosParaListar(programa: ProgramaEstado | null, ciclos: CicloPrograma[], nowTs: number): CicloListado[] {
  const out: CicloListado[] = []
  if (programa && !programa.terminado) {
    const semana = semanaDelPrograma(programa.inicio, nowTs)
    if (semana >= 1) {
      const enCurso = semana <= SEMANAS_PROGRAMA
      out.push({ inicio: programa.inicio, fin: finDeCiclo(programa.inicio), enCurso, semana: enCurso ? semana : null })
    }
  }
  for (const c of ciclos) {
    if (out.some((o) => o.inicio === c.inicio)) continue
    out.push({ ...c, enCurso: false, semana: null })
  }
  return out.sort((a, b) => b.inicio - a.inicio)
}

// ---------------------------------------------------------------- Textos

/** "130 × 12", "12 reps", "1:30 min". */
export function textoMarca(kind: RecordKind, m: Marca): string {
  if (kind === 'tiempo') return formatDuration(m.durationSec ?? 0)
  if (kind === 'reps') return m.kg > 0 ? `${formatKg(m.kg)} × ${m.reps}` : `${m.reps} reps`
  return `${formatKg(m.kg)} × ${m.reps}`
}

/** "+8 %", "−5 %", "0 %"; con decimal si redondeado daría 0 sin serlo. null → "—". */
export function textoPct(pct: number | null): string {
  if (pct === null) return '—'
  if (pct === 0) return '0\u00a0%'
  const abs = Math.abs(pct)
  const n = Math.round(abs) === 0 ? formatKg(Math.round(abs * 10) / 10) : String(Math.round(abs))
  return `${pct > 0 ? '+' : '−'}${n}\u00a0%`
}

/** Horas con un decimal y coma: "12,5". */
export function textoHoras(minutos: number): string {
  return formatKg(Math.round((minutos / 60) * 10) / 10)
}

/** Miles con punto: "12.345". */
export function textoMiles(n: number): string {
  return Math.round(n).toLocaleString('es-AR')
}

export const FRANJA_TEXTO = { mañana: 'a la mañana', tarde: 'a la tarde', noche: 'a la noche' } as const

// ---------------------------------------------------------------- Ciclo

/** Los que subieron, del que más al que menos. */
export function losQueMasSubieron(filas: FilaEjercicioCiclo[], n = 3): FilaEjercicioCiclo[] {
  return filas.filter((f) => f.cambioPct > 0).sort((a, b) => b.cambioPct - a.cambioPct).slice(0, n)
}

/**
 * Sin progreso por ningún lado: ni entre bloques ni dentro de cada uno. Una
 * fila que baja entre bloques pero sube dentro del 4-6 está progresando (el
 * plan pidió menos reps), así que no es candidata.
 */
export function candidatosACambiar(filas: FilaEjercicioCiclo[]): FilaEjercicioCiclo[] {
  return filas.filter((f) => f.cambioPct <= 0 && (f.dentroDeBloque.base ?? 0) <= 0 && (f.dentroDeBloque.alt ?? 0) <= 0)
}

// ---------------------------------------------------------------- Tu año

export interface TarjetaAnio {
  id: string
  eyebrow: string
  /** La cifra (o palabra) grande. */
  grande: string
  unidad?: string
  frase: string
  detalles: string[]
  /** Filas "nombre · valor" (los récords del año). */
  lista?: { nombre: string; valor: string }[]
  /** 'record' pinta la cifra de ámbar. */
  tono?: 'record'
}

/** Cuántos entrenos por semana, para elegir la frase. */
function frasePorFrecuencia(porSemana: number): string {
  if (porSemana >= 3.5) return 'Más de tres por semana. En la recepción ya te saludan por el nombre.'
  if (porSemana >= 2.5) return 'Casi tres por semana. Constancia de la buena.'
  if (porSemana >= 1.5) return 'Dos por semana, sin aflojar.'
  return 'Cada entreno suma. Y vos sumaste.'
}

/** Los 3 récords que más superaron la marca anterior, uno por ejercicio (si no, salía tres veces el mismo). */
function mejoresPorEjercicio(r: ResumenAnual): ResumenAnual['records'] {
  const vistos = new Set<string>()
  return r.records
    .filter((x) => x.pct != null && x.pct > 0)
    .sort((a, b) => b.pct! - a.pct!)
    .filter((x) => !vistos.has(x.exerciseId) && !!vistos.add(x.exerciseId))
    .slice(0, 3)
}

/**
 * Las tarjetas del resumen del año, en orden. Las que no tienen datos (sin
 * récords, sin mediciones) no van.
 */
export function tarjetasDelAnio(r: ResumenAnual, nombre: (exerciseId: string) => string): TarjetaAnio[] {
  const t: TarjetaAnio[] = []
  t.push({
    id: 'intro',
    eyebrow: 'Tu año en el gym',
    grande: String(r.year),
    frase: r.empezoEsteAnio ? `Desde el ${fechaLarga(r.desde)}, esto es lo que hiciste.` : 'Esto es lo que hiciste este año.',
    detalles: [],
  })

  const semanas = Math.max(1, r.diasDeUso / 7)
  const detEntrenos = [`en ${r.dias} ${r.dias === 1 ? 'día' : 'días'} distintos`, `${textoMiles(r.series)} series`]
  if (r.conDuracion > 0) detEntrenos.splice(1, 0, `${textoHoras(r.minutos)} horas entrenando`)
  t.push({
    id: 'entrenos',
    eyebrow: 'Entrenos',
    grande: String(r.sesiones),
    unidad: r.sesiones === 1 ? 'entreno' : 'entrenos',
    frase: frasePorFrecuencia(r.sesiones / semanas),
    detalles: detEntrenos,
  })

  if (r.toneladas) {
    t.push({
      id: 'toneladas',
      eyebrow: 'Peso movido',
      grande: formatKg(r.toneladas.total),
      unidad: 'toneladas',
      frase: `Es como levantar ${formatKg(r.toneladas.cantidad)} ${r.toneladas.cosa}.`,
      detalles: ['Sumando kilos × reps de cada serie, sin calentamiento.'],
    })
  }

  if (r.recordsTotal > 0) {
    t.push({
      id: 'records',
      eyebrow: '🏆 Récords',
      grande: String(r.recordsTotal),
      unidad: r.recordsTotal === 1 ? 'récord' : 'récords',
      frase: r.recordsTotal === 1 ? 'Una marca tuya que quedó atrás.' : 'Cada uno, una marca tuya que quedó atrás.',
      detalles: [],
      lista: mejoresPorEjercicio(r).map((x) => ({ nombre: nombre(x.exerciseId), valor: `${textoMarca(x.kind, x.marca)} · ${textoPct(x.pct)}` })),
      tono: 'record',
    })
  }

  if (r.ejercicioDelAnio) {
    const e = r.ejercicioDelAnio
    const det = [`${e.series} series${e.records ? ` · ${e.records} ${e.records === 1 ? 'récord' : 'récords'}` : ''}`]
    if (r.mayorSubida) {
      const s = r.mayorSubida
      det.push(`La que más subió: ${nombre(s.exerciseId)}, ${textoMarca(s.kind, s.antes)} → ${textoMarca(s.kind, s.despues)} (${textoPct(s.pct)})`)
    }
    t.push({
      id: 'ejercicio',
      eyebrow: 'Tu ejercicio del año',
      grande: nombre(e.exerciseId),
      frase: e.records > 0 ? 'El que más veces te hizo romper tu marca.' : 'El que más series se llevó.',
      detalles: det,
    })
  }

  if (r.mejorRachaSemanas > 0) {
    const det: string[] = []
    if (r.mesMasFuerte) det.push(`Tu mes más fuerte fue ${MESES[r.mesMasFuerte.month]}: ${r.mesMasFuerte.series} series.`)
    if (r.ciclosCompletados > 0) det.push(`${r.ciclosCompletados} ${r.ciclosCompletados === 1 ? 'ciclo del plan completo' : 'ciclos del plan completos'}.`)
    t.push({
      id: 'racha',
      eyebrow: 'Mejor racha',
      grande: String(r.mejorRachaSemanas),
      unidad: r.mejorRachaSemanas === 1 ? 'semana seguida' : 'semanas seguidas',
      frase: r.mejorRachaSemanas >= 4 ? 'Sin cortar ni una. Eso no es suerte.' : 'Lo importante es volver. Y volviste.',
      detalles: det,
    })
  }

  if (r.diaFavorito) {
    const dia = DIAS_SEMANA[r.diaFavorito.dow]
    const plural = dia.endsWith('s') ? dia : `${dia}s`
    t.push({
      id: 'dia',
      eyebrow: 'Tu momento',
      grande: mayuscula(plural),
      frase: `Los ${plural}${r.franjaFavorita ? ` ${FRANJA_TEXTO[r.franjaFavorita.franja]}` : ''} son tuyos.`,
      detalles: [`${r.diaFavorito.sesiones} entrenos ese día`],
    })
  }

  if (r.cuerpo) {
    const { weightKg, cintura } = r.cuerpo
    const principal = weightKg ?? cintura!
    const unidad = weightKg ? 'kg' : 'cm de cintura'
    const det: string[] = []
    if (weightKg) det.push(`Peso: de ${formatKg(weightKg.desde)} a ${formatKg(weightKg.hasta)} kg`)
    if (cintura) det.push(`Cintura: de ${formatKg(cintura.desde)} a ${formatKg(cintura.hasta)} cm`)
    t.push({
      id: 'cuerpo',
      eyebrow: 'Tu cuerpo',
      grande: `${principal.cambio > 0 ? '+' : principal.cambio < 0 ? '−' : ''}${formatKg(Math.abs(principal.cambio))}`,
      unidad,
      frase: 'Lo que cambia por fuera también cuenta.',
      detalles: det,
    })
  }

  const final: string[] = [
    `${r.sesiones} entrenos`,
    `${textoMiles(r.series)} series`,
  ]
  if (r.recordsTotal) final.push(`${r.recordsTotal} récords`)
  if (r.toneladas) final.push(`${formatKg(r.toneladas.total)} toneladas`)
  if (r.anioAnterior?.sesiones.pct != null) {
    const p = r.anioAnterior.sesiones.pct
    final.push(`${textoPct(p)} de entrenos que en ${r.year - 1}`)
  }
  t.push({
    id: 'final',
    eyebrow: `Tu ${r.year}`,
    grande: '¡Bien ahí!',
    frase: `Nos vemos en ${r.year + 1}. Que sea todavía más fuerte.`,
    detalles: final,
  })
  return t
}
