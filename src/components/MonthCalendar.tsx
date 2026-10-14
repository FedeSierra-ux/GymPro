import { useHoy } from '../utils/useHoy'
import type { Routine, Workout } from '../types'
import { dayKey, setsByDay, routineByDay, routineColor } from '../utils/trainingDays'
import { planDeSemana, type WeekOverrides } from '../utils/weekPlan'
import { S } from '../theme'

/** Semana que arranca en lunes, como el calendario de acá. */
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface DayCell {
  day: number
  key: string
  ts: number
  sets: number
  routineId?: string
  isFuture: boolean
  isToday: boolean
}

/**
 * Calendario del mes con cada día entrenado pintado del color de su rutina y
 * los planificados con un aro de ese color. Los
 * días de la semana van arriba en horizontal y cada fila es una semana, así se
 * lee de un vistazo qué días se fue y si se están alternando bien las rutinas.
 */
export function MonthCalendar({
  year, month, workouts, routines, onSelectDay, weekPlan, weekOverrides, planPorDia, desde,
}: {
  year: number
  month: number
  workouts: Workout[]
  /** Para el color y la leyenda: el orden de la lista fija el color de cada rutina. */
  routines: Routine[]
  /** Si se pasa, cada día es clickeable y devuelve su timestamp al mediodía. */
  onSelectDay?: (ts: number) => void
  /** Semana tipo (0 = lunes → rutina): los días planificados llevan un aro del color de esa rutina. */
  weekPlan?: Record<number, string | null>
  /** Semanas con plan propio (por la clave de su lunes): mandan sobre la semana tipo. */
  weekOverrides?: WeekOverrides
  /**
   * Plan en orden: qué rutina cae en cada día de hoy en adelante. Si se pasa,
   * manda sobre la semana tipo para los días que vienen (si faltaste uno, las
   * rutinas se corren).
   */
  planPorDia?: Map<string, string>
  /** Antes de este día (el que se empezó a usar la app) no se marcan días planificados. */
  desde?: number | null
}) {
  // Una sola lectura del reloj por montaje: el render tiene que ser puro.
  const nowTs = useHoy()
  const byDay = setsByDay(workouts)
  const rutinaDelDia = routineByDay(workouts)
  const routineIds = routines.map((r) => r.id)
  const todayKey = dayKey(nowTs)
  const now = new Date(nowTs)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // 0 = lunes.
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7

  const cells: (DayCell | null)[] = Array.from({ length: startDow }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const key = dayKey(date.getTime())
    cells.push({
      day, key, ts: date.getTime(),
      sets: byDay.get(key) ?? 0,
      routineId: rutinaDelDia.get(key),
      isFuture: date.getTime() > endOfToday,
      isToday: key === todayKey,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  // Sólo las rutinas que aparecen este mes entran en la leyenda.
  const rutinasDelMes = routines.filter((r) =>
    cells.some((c) => c && !c.isFuture && c.routineId === r.id)
  )
  const hayBorradas = cells.some((c) => c?.routineId && !routineIds.includes(c.routineId))

  return (
    <div>
      {/* Días de la semana, en horizontal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ fontSize: 11, color: S.faint, textAlign: 'center', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      {/* Una fila por semana */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {week.map((cell, ci) => {
              if (!cell) return <div key={`e-${ci}`} style={{ aspectRatio: '1' }} />
              const entrenado = !cell.isFuture && cell.sets > 0
              const color = entrenado && cell.routineId ? routineColor(cell.routineId, routines) : null
              const date = new Date(cell.ts)
              const dow = (date.getDay() + 6) % 7
              // Entrenado: relleno. Planificado: aro con el color de la rutina
              // (tenue si ya pasó y no se hizo). Descanso: vacío.
              const planDelDia = weekPlan ? planDeSemana(weekPlan, weekOverrides ?? {}, cell.ts) : undefined
              const rutinaSemana = planDelDia?.[dow] && routineIds.includes(planDelDia[dow]!) ? planDelDia[dow]! : null
              const rutinaPlan = planPorDia && rutinaSemana && (cell.isFuture || cell.isToday)
                ? planPorDia.get(cell.key) ?? rutinaSemana
                : rutinaSemana
              const antesDeEmpezar = desde != null && cell.ts < desde
              const planned = !entrenado && rutinaPlan != null && !antesDeEmpezar
              const pasado = !cell.isFuture && !cell.isToday
              const aro = planned ? routineColor(rutinaPlan, routines) : null
              const nombreRutina = cell.routineId
                ? routines.find((r) => r.id === cell.routineId)?.name ?? 'rutina eliminada'
                : null
              const etiqueta = `${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}: ${
                entrenado ? `${nombreRutina}, ${cell.sets} series`
                  : planned ? `planificado: ${routines.find((r) => r.id === rutinaPlan)?.name}` : 'descanso'
              }`
              return (
                <div
                  key={cell.key}
                  role={onSelectDay ? 'button' : undefined}
                  tabIndex={onSelectDay ? 0 : undefined}
                  aria-label={onSelectDay ? etiqueta : undefined}
                  title={etiqueta}
                  onClick={onSelectDay ? () => onSelectDay(new Date(year, month, cell.day, 12).getTime()) : undefined}
                  onKeyDown={onSelectDay ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectDay(new Date(year, month, cell.day, 12).getTime())
                    }
                  } : undefined}
                  style={{
                    aspectRatio: '1', borderRadius: 8, position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: color ?? 'transparent',
                    border: aro
                      ? `2px solid ${aro}`
                      : cell.isToday ? `1.5px solid ${S.ink}` : '2px solid transparent',
                    opacity: aro && pasado ? 0.4 : 1,
                    boxShadow: entrenado && cell.isToday ? `0 0 0 2px ${S.bg}, 0 0 0 3.5px ${S.ink}` : undefined,
                    color: entrenado ? '#0C0E14' : aro ? S.ink : cell.isFuture ? S.faint : S.dim,
                    fontSize: 12, fontWeight: entrenado || cell.isToday ? 700 : 500,
                    cursor: onSelectDay ? 'pointer' : 'default',
                  }}
                >
                  <span className="num">{cell.day}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Leyenda: qué rutina es cada color */}
      {(rutinasDelMes.length > 0 || hayBorradas) && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5" style={{ marginTop: 12 }}>
          {rutinasDelMes.map((r) => (
            <span key={r.id} className="flex items-center gap-1.5" style={{ fontSize: 11, color: S.dim }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: routineColor(r.id, routines), flexShrink: 0 }} />
              {r.name}
            </span>
          ))}
          {hayBorradas && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: S.dim }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: '#6B7280', flexShrink: 0 }} />
              Rutina eliminada
            </span>
          )}
        </div>
      )}
    </div>
  )
}
