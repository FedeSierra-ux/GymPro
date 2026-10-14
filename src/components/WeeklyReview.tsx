import { useHoy } from '../utils/useHoy'
import { useStore } from '../store/useStore'
import { lunesDe } from '../utils/program'
import { dayKey, inicioDeFaltas, plannedDowSet } from '../utils/trainingDays'
import { planDeSemana } from '../utils/weekPlan'
import { seriesEfectivas } from '../utils/volume'

/**
 * Repaso de la semana pasada. Aparece desde el lunes y se va con la cruz hasta
 * el lunes siguiente. Si la semana pasada no hubo entrenos, no se muestra.
 */
export function WeeklyReview() {
  const { workouts, prs, weekPlan, weekOverrides, routines, repasoCerrado, cerrarRepaso, weeklyGoal, inicioUso } = useStore()
  const nowTs = useHoy()
  const lunes = lunesDe(nowTs)
  const clave = dayKey(lunes)
  if (repasoCerrado === clave) return null

  const l = new Date(lunes)
  const lunesPasado = new Date(l.getFullYear(), l.getMonth(), l.getDate() - 7).getTime()
  const semana = workouts.filter((w) => w.finishedAt && w.startedAt >= lunesPasado && w.startedAt < lunes)
  if (!semana.length) return null

  // Si la app se empezó a usar en el medio de esa semana, cuentan sólo los días desde entonces.
  const desde = inicioDeFaltas(inicioUso, workouts) ?? lunesPasado
  const planificados = weeklyGoal ?? [...plannedDowSet(planDeSemana(weekPlan, weekOverrides, lunesPasado), routines.map((r) => r.id))]
    .filter((dow) => new Date(l.getFullYear(), l.getMonth(), l.getDate() - 7 + dow).getTime() >= desde).length
  // Días entrenados, no entrenos: dos sesiones el mismo día daban "4 de 3".
  const diasEntrenados = new Set(semana.map((w) => dayKey(w.startedAt))).size
  const series = seriesEfectivas(semana)
  const fechas = new Set(semana.map((w) => w.startedAt))
  const records = prs.reduce((n, p) => n + [p, ...(p.history ?? [])].filter((h) => fechas.has(h.date)).length, 0)

  return (
    <div style={{ padding: '12px 22px 0' }}>
      <section
        aria-label="Repaso de la semana pasada"
        style={{ background: 'var(--surf)', borderRadius: 16, border: '1px solid var(--line2)', padding: '10px 6px 12px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Semana pasada</span>
          <button
            onClick={() => cerrarRepaso(clave)}
            aria-label="Cerrar el repaso hasta el lunes que viene"
            style={{ width: 36, height: 36, background: 'none', border: 'none', color: 'var(--dim)', fontSize: 15, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--dim)', paddingRight: 8 }}>
          <span>
            <b className="num" style={{ color: 'var(--ink)', fontSize: 15 }}>{planificados > 0 ? diasEntrenados : semana.length}</b>
            {planificados > 0 ? <> de <span className="num">{planificados}</span> días</> : semana.length === 1 ? ' entreno' : ' entrenos'}
          </span>
          <span><b className="num" style={{ color: 'var(--ink)', fontSize: 15 }}>{series}</b> series</span>
          <span>
            <b className="num" style={{ color: records ? 'var(--acc2)' : 'var(--ink)', fontSize: 15 }}>{records}</b>
            {records === 1 ? ' récord' : ' récords'}
          </span>
        </div>
      </section>
    </div>
  )
}
