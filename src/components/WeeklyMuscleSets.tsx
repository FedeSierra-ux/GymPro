import { useHoy } from '../utils/useHoy'
import { useStore, useAllExercises } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { MuscleIcon } from './MuscleIcon'
import { seriesPorGrupo, SERIES_SEMANA_MIN, SERIES_SEMANA_MAX } from '../utils/volume'
import { lunesDe } from '../utils/program'
import { planDeSemana } from '../utils/weekPlan'
import type { MuscleGroup } from '../types'

/**
 * Series de la semana en curso por grupo muscular, contra la franja de 10 a 20
 * que se suele recomendar. Muestra los grupos que trabajan tus rutinas, así un
 * grupo que quedó corto se ve aunque todavía tenga cero.
 */
export function WeeklyMuscleSets() {
  const { workouts, routines, weekPlan: planBase, weekOverrides } = useStore()
  const allExercises = useAllExercises()
  const nowTs = useHoy()
  const desde = lunesDe(nowTs)
  const weekPlan = planDeSemana(planBase, weekOverrides, nowTs)
  const porGrupo = seriesPorGrupo(workouts, allExercises, desde, nowTs + 1)

  // Los grupos de las rutinas del plan (o de todas, si no hay plan).
  const delPlan = routines.filter((r) => Object.values(weekPlan).includes(r.id))
  const fuente = delPlan.length ? delPlan : routines
  const porId = new Map(allExercises.map((e) => [e.id, e]))
  const grupos = new Set<MuscleGroup>()
  for (const r of fuente) for (const re of r.exercises) {
    const mg = porId.get(re.exerciseId)?.muscleGroup
    if (mg) grupos.add(mg)
  }
  for (const mg of porGrupo.keys()) grupos.add(mg)
  grupos.delete('cardio')
  if (!grupos.size) return null

  const filas = [...grupos]
    .map((g) => ({ g, n: porGrupo.get(g) ?? 0 }))
    .sort((a, b) => b.n - a.n || muscleGroupConfig[a.g].label.localeCompare(muscleGroupConfig[b.g].label))
  const tope = Math.max(SERIES_SEMANA_MAX + 4, ...filas.map((f) => f.n))
  const pct = (v: number) => `${(v / tope) * 100}%`

  return (
    <div style={{ padding: '12px 22px 0' }}>
      <section
        aria-label="Series de esta semana por músculo"
        style={{ background: 'var(--surf)', borderRadius: 14, border: '1px solid var(--line2)', padding: '12px 14px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Series esta semana</span>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>
            objetivo <span className="num">{SERIES_SEMANA_MIN}-{SERIES_SEMANA_MAX}</span>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 26px', gap: '8px 10px', alignItems: 'center' }}>
          {filas.map(({ g, n }) => {
            const cfg = muscleGroupConfig[g]
            const enFranja = n >= SERIES_SEMANA_MIN
            return (
              <div key={g} style={{ display: 'contents' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)', minWidth: 78 }}>
                  <MuscleIcon group={g} size={16} />
                  {cfg.label}
                </span>
                <span
                  role="img"
                  aria-label={`${cfg.label}: ${n} series${enFranja ? '' : `, faltan ${SERIES_SEMANA_MIN - n} para llegar a ${SERIES_SEMANA_MIN}`}`}
                  style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surf2)', overflow: 'hidden' }}
                >
                  <span style={{
                    position: 'absolute', top: 0, bottom: 0, left: pct(SERIES_SEMANA_MIN),
                    width: pct(SERIES_SEMANA_MAX - SERIES_SEMANA_MIN), background: 'rgba(236,238,244,0.07)',
                  }} />
                  <span style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, width: pct(n), borderRadius: 4,
                    background: cfg.color, opacity: enFranja ? 1 : 0.55,
                  }} />
                </span>
                <span className="num" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink)' }}>{n}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
