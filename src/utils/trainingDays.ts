import type { Routine, Workout } from '../types'

/** Clave YYYY-MM-DD en hora local (no UTC: si no, los entrenos de la noche caen al día siguiente). */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Series efectivas (sin calentamiento) por día. */
export function setsByDay(workouts: Workout[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const w of workouts) {
    if (!w.finishedAt) continue
    const key = dayKey(w.startedAt)
    const sets = w.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter(s => !s.isWarmup).length,
      0
    )
    map.set(key, (map.get(key) ?? 0) + sets)
  }
  return map
}

/** Qué rutina se hizo cada día (la primera, si hubo más de una). */
export function routineByDay(workouts: Workout[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    if (!w.finishedAt) continue
    const key = dayKey(w.startedAt)
    if (!map.has(key)) map.set(key, w.routineId)
  }
  return map
}

/**
 * Paleta del calendario, una entrada por rutina.
 *
 * Antes los días se pintaban por cantidad de series en cinco intensidades, pero
 * las sesiones reales tienen todas más o menos el mismo volumen: los trece días
 * de un mes salían del mismo color y el degradé no decía nada. Pintar por rutina
 * responde la pregunta que uno de verdad le hace a un calendario de entrenos:
 * ¿estoy alternando bien?
 */
export const ROUTINE_COLORS = [
  '#E8634A', // coral — el acento de la app
  '#38BDF8', // celeste
  '#A78BFA', // violeta
  '#34D399', // verde
  '#F2A93B', // ámbar
  '#F472B6', // rosa
]

/**
 * Color de una rutina: el que quedó guardado al crearla. Antes salía de la
 * posición en la lista, y borrar una rutina le cambiaba el color a las de
 * después, también en todo el calendario histórico.
 */
export function routineColor(routineId: string, routines: Array<Pick<Routine, 'id' | 'color'>>): string {
  const idx = routines.findIndex((r) => r.id === routineId)
  if (idx < 0) return '#6B7280' // rutina borrada: gris
  return ROUTINE_COLORS[(routines[idx].color ?? idx) % ROUTINE_COLORS.length]
}

/**
 * Les fija color a las rutinas que no lo tienen: el primero de la paleta que
 * no esté usado (o el que les tocaba por posición, si se migran en orden).
 */
export function conColores<R extends Pick<Routine, 'color'>>(routines: R[]): R[] {
  if (routines.every((r) => r.color !== undefined)) return routines
  const usados = new Set(routines.map((r) => r.color).filter((c): c is number => c !== undefined))
  return routines.map((r, i) => {
    if (r.color !== undefined) return r
    let color = ROUTINE_COLORS.findIndex((_, c) => !usados.has(c))
    if (color < 0) color = i % ROUTINE_COLORS.length
    usados.add(color)
    return { ...r, color }
  })
}

export interface MonthStats {
  /** Días con al menos un entreno (sin contar los días futuros). */
  trained: number
  /** Series efectivas del mes. */
  totalSets: number
  /** Días transcurridos del mes. */
  daysCounted: number
  /** Días que la semana tipo pedía entrenar y ya pasaron. */
  planned: number
  /**
   * Cumplimiento del plan, en porcentaje: entrenos hechos sobre entrenos
   * planificados. Antes se dividía por todos los días del mes, así que ir tres
   * veces por semana —el plan cumplido al 100%— daba 42% y parecía un fracaso.
   * Puede pasar de 100 si entrenaste más días de los que tenías planificados.
   */
  attendance: number
}

/**
 * Cuántos días de la semana tienen rutina asignada. Es el denominador honesto
 * de la asistencia: nadie entrena los 31 días del mes.
 *
 * `routineIds`, si se pasa, descarta los días que apuntan a una rutina borrada:
 * datos guardados antes de que `deleteRoutine` limpiara la semana tipo podían
 * dejar un día contando como planificado aunque el selector lo mostrara como
 * Descanso.
 */
export function plannedDowSet(weekPlan: Record<number, string | null>, routineIds?: string[]): Set<number> {
  return new Set(
    Object.entries(weekPlan)
      .filter(([, id]) => !!id && (!routineIds || routineIds.includes(id)))
      .map(([dow]) => Number(dow))
  )
}

/** Las mismas cuentas que muestra la grilla, para el encabezado de la pantalla. */
export function monthStats(
  workouts: Workout[],
  year: number,
  month: number,
  nowTs: number,
  plannedDows?: Set<number> | ((date: Date) => boolean),
): MonthStats {
  const byDay = setsByDay(workouts)
  const now = new Date(nowTs)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let trained = 0, totalSets = 0, daysCounted = 0, planned = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    if (date.getTime() > endOfToday) continue
    daysCounted++
    // 0 = lunes, igual que el calendario y la semana tipo.
    const dow = (date.getDay() + 6) % 7
    if (typeof plannedDows === 'function' ? plannedDows(date) : plannedDows?.has(dow)) planned++
    const sets = byDay.get(dayKey(date.getTime())) ?? 0
    if (sets > 0) { trained++; totalSets += sets }
  }
  // Sin semana tipo armada no hay plan contra el cual medir: se cae al mejor
  // sustituto disponible, que son los días transcurridos.
  const denominador = planned > 0 ? planned : daysCounted
  return {
    trained, totalSets, daysCounted, planned,
    attendance: denominador > 0 ? Math.round((trained / denominador) * 100) : 0,
  }
}

/**
 * Resumen de los últimos N días, sin cortar por mes calendario.
 *
 * El mes calendario mentía todos los días 1: alguien con dieciséis entrenos
 * encadenados abría la app y leía "0 de 15 · 0 h · 0 PRs". Una ventana móvil
 * mide lo mismo sin ese acantilado.
 */
export interface WindowStats {
  workouts: number
  sets: number
  minutes: number
  hours: number
  /** Entrenos por semana en la ventana, con un decimal. */
  perWeek: number
}

export function windowStats(workouts: Workout[], nowTs: number, days = 30): WindowStats {
  const desde = nowTs - days * 86400000
  const enVentana = workouts.filter((w) => w.finishedAt && w.startedAt >= desde)
  const sets = enVentana.reduce(
    (acc, w) => acc + w.exercises.reduce((a, ex) => a + ex.sets.filter((s) => !s.isWarmup).length, 0),
    0
  )
  const minutes = enVentana.reduce((a, w) => a + (w.durationMin ?? 0), 0)
  return {
    workouts: enVentana.length,
    sets,
    minutes,
    hours: Math.round((minutes / 60) * 10) / 10,
    perWeek: Math.round((enVentana.length / (days / 7)) * 10) / 10,
  }
}
