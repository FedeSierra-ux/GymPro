import { useHoy } from '../utils/useHoy'
import { useStore, useAllExercises } from '../store/useStore'
import { useWorkoutStore } from '../stores/workoutStore'
import { BackupReminder } from '../components/BackupReminder'
import { getWorkoutStreak } from '../utils/streak'
import { plannedDowSet, dayKey, inicioDeFaltas } from '../utils/trainingDays'
import { planDeSemana } from '../utils/weekPlan'
import { prediccionDelPlan } from '../utils/planOrder'
import { haceCuanto } from '../utils/relativeDate'
import { ProgramCard } from '../components/ProgramCard'
import { WeeklyReview } from '../components/WeeklyReview'
import { WeeklyMuscleSets } from '../components/WeeklyMuscleSets'
import { RoutineIcon } from '../components/RoutineIcon'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function formatDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('es-AR', { weekday: 'long' })
  const day = now.getDate()
  const month = now.toLocaleDateString('es-AR', { month: 'long' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

export function HomeScreen() {
  const { userName, avatarPhoto, workouts, routines, prs, weekPlan: planBase, weekOverrides, weeklyGoal, setActiveTab, openAgendaDay, getArchivedRoutineName, inicioUso } = useStore()
  const allExercises = useAllExercises()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)

  const finishedWorkouts = workouts.filter(w => w.finishedAt)
  const sortedWorkouts = [...finishedWorkouts].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
  const lastWorkout = sortedWorkouts[0]
  const lastRoutineVigente = lastWorkout ? routines.find(r => r.id === lastWorkout.routineId) : undefined
  const lastRoutine = lastWorkout
    ? (lastRoutineVigente ?? getArchivedRoutineName(lastWorkout.routineId))
    : null

  const nowTs = useHoy()
  // La semana en curso puede tener un plan propio distinto de la semana por defecto.
  const weekPlan = planDeSemana(planBase, weekOverrides, nowTs)
  // Racha por entrenos encadenados, no por días corridos: entrenar día por
  // medio (o tres veces por semana cambiando los días) no la corta.
  const streak = getWorkoutStreak(finishedWorkouts, nowTs)
  const diasPlanificados = plannedDowSet(weekPlan, routines.map(r => r.id)).size

  // La semana en curso, de lunes a domingo: hecho, planificado o descanso.
  const hoy = new Date(nowTs)
  const hoyIdx = (hoy.getDay() + 6) % 7
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoyIdx)
  const diasEntrenados = new Set(finishedWorkouts.map(w => dayKey(w.startedAt)))
  // Los días anteriores a empezar a usar la app no son faltas ni cuentan para la meta.
  const desde = inicioDeFaltas(inicioUso, finishedWorkouts)
  const semana = DIAS.map((letra, i) => {
    const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i)
    const antesDeEmpezar = desde != null && fecha.getTime() < desde
    const rutinaPlan = !antesDeEmpezar && weekPlan[i] && routines.some(r => r.id === weekPlan[i]) ? weekPlan[i] : null
    return {
      letra,
      hecho: diasEntrenados.has(dayKey(fecha.getTime())),
      planificado: !!rutinaPlan,
      pasado: i < hoyIdx,
      esHoy: i === hoyIdx,
    }
  })
  const hechosSemana = semana.filter(d => d.hecho).length
  // La meta de Ajustes manda; sin meta, los días de la semana tipo.
  const metaSemana = weeklyGoal ?? semana.filter(d => d.planificado).length

  // Last session stats (con días de calendario: el cambio de horario no corre la cuenta)
  const daysAgoStr = lastWorkout ? haceCuanto(lastWorkout.startedAt, nowTs) : ''
  const lastTotalSets = lastWorkout?.exercises.reduce((a, e) => a + e.sets.filter(s => !s.isWarmup).length, 0) ?? 0
  // Los récords quedan fechados con el inicio del entreno en que se hicieron.
  const lastRecords = lastWorkout
    ? prs.reduce((n, p) => n + [p, ...(p.history ?? [])].filter(h => h.date === lastWorkout.startedAt).length, 0)
    : 0

  // Qué toca hoy. La semana tipo dice qué días se entrena y en qué orden van
  // las rutinas, pero no ata cada rutina a un día: toca la siguiente a la
  // última que hiciste. Si faltaste el miércoles, el viernes te espera brazos.
  const hoyDow = (new Date(nowTs).getDay() + 6) % 7  // 0 = lunes
  const routineIds = routines.map(r => r.id)
  // La misma cuenta que la Agenda: en una semana con plan propio manda la
  // rutina que se puso ese día, y si no, la siguiente en el orden.
  const delPlan = prediccionDelPlan(planBase, routineIds, finishedWorkouts, nowTs, 14, weekOverrides).values().next().value ?? null
  const proximaPlan = delPlan ? routines.find(r => r.id === delPlan) : undefined
  const yaEntreneHoy = lastWorkout
    ? new Date(lastWorkout.startedAt).toDateString() === new Date(nowTs).toDateString()
    : false
  const hoySeEntrena = !!weekPlan[hoyDow] && routineIds.includes(weekPlan[hoyDow]!)

  // Sin semana tipo: la rutina que hace más tiempo que no tocás, evitando
  // repetir la última.
  const lastPerformedAt = new Map<string, number>()
  for (const w of sortedWorkouts) {
    if (!lastPerformedAt.has(w.routineId)) lastPerformedAt.set(w.routineId, w.finishedAt ?? w.startedAt)
  }
  // Una rutina sin ejercicios no se puede arrancar: el entreno quedaba sin
  // forma de terminarse.
  const conEjercicios = routines.filter(r => r.exercises.length > 0)
  const otherRoutines = conEjercicios.filter(r => r.id !== lastWorkout?.routineId)
  const suggestionPool = otherRoutines.length > 0 ? otherRoutines : conEjercicios
  const porRotacion = [...suggestionPool].sort(
    (a, b) => (lastPerformedAt.get(a.id) ?? 0) - (lastPerformedAt.get(b.id) ?? 0)
  )[0]
  const suggestedRoutine = (proximaPlan && proximaPlan.exercises.length > 0 ? proximaPlan : undefined) ?? porRotacion
  const esDelPlan = !!proximaPlan && hoySeEntrena && !yaEntreneHoy
  // Día de descanso según el plan: se dice, no se esconde.
  const esDescansoPlanificado = diasPlanificados > 0 && !hoySeEntrena && !yaEntreneHoy
  const suggestedExerciseCount = suggestedRoutine?.exercises.length ?? 0
  const approxMinutes = Math.round((suggestedRoutine?.exercises.reduce((a, e) => a + e.sets * 2.5, 0) ?? 0))
  const previewExercises = suggestedRoutine?.exercises.slice(0, 4).map(re => {
    const ex = allExercises.find(e => e.id === re.exerciseId)
    return ex ? { name: ex.nameEs, sets: re.sets } : null
  }).filter(Boolean) ?? []

  const userInitial = userName?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <div className="flex-1 min-h-0 scroll-area">

        {/* Header */}
        <div style={{ paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 22px))', paddingLeft: 22, paddingRight: 22 }}>
          <div className="flex justify-between items-center">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--dim)', letterSpacing: 0.3 }}>
                {formatDate()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 2, color: 'var(--ink)' }}>
                Hola, {userName}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('perfil')}
              aria-label="Abrir perfil"
              style={{
                flexShrink: 0, width: 44, height: 44, borderRadius: 22,
                background: 'var(--surf2)', border: '2px solid var(--acc)', overflow: 'hidden', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 700, color: 'var(--acc)',
              }}
            >
              {avatarPhoto
                ? <img src={avatarPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : userInitial}
            </button>
          </div>
        </div>

        {/* Qué toca hoy — lo primero, con el botón de arrancar sobre el pliegue */}
        <div style={{ padding: '16px 22px 0' }}>
          {suggestedRoutine ? (
            <div style={{ background: 'var(--surf)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line2)' }}>
              <div style={{ padding: '16px 18px 14px' }}>
                <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dim)', letterSpacing: 0.3 }}>
                    {yaEntreneHoy ? 'Próximo entreno' : esDelPlan ? 'Hoy te toca' : esDescansoPlanificado ? 'Hoy descansás' : 'Próximo entreno'}
                  </span>
                  {esDelPlan && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc)', background: 'rgba(232,99,74,0.12)', border: '1px solid rgba(232,99,74,0.22)', padding: '3px 9px', borderRadius: 24 }}>
                      Sigue tu plan
                    </span>
                  )}
                  {esDescansoPlanificado && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', background: 'var(--surf2)', border: '1px solid var(--line2)', padding: '3px 9px', borderRadius: 24 }}>
                      podés adelantar
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--ink)' }}>
                  <RoutineIcon routine={suggestedRoutine} size={20} />
                  <span style={{ minWidth: 0 }}>{suggestedRoutine.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>
                  {suggestedExerciseCount} ejercicios · ~{approxMinutes} min · {previewExercises.map(e => e?.name).filter(Boolean).slice(0, 2).join(', ')}
                  {suggestedExerciseCount > 2 ? '…' : ''}
                </div>
              </div>
              <button
                onClick={() => startWorkout(suggestedRoutine.id)}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, var(--acc) 0%, var(--acc-dim) 100%)', border: 'none',
                  color: 'var(--on-acc)', fontSize: 17, fontWeight: 700, minHeight: 56,
                  cursor: 'pointer', letterSpacing: 0.3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 13 }}>▶</span> Iniciar entreno
              </button>
              {/* Cualquier otra rutina, sin pasar por la pestaña Rutinas */}
              {conEjercicios.length > 1 && (
                <div
                  className="flex gap-2"
                  style={{ padding: '10px 14px 12px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid var(--line)' }}
                >
                  {conEjercicios.filter(r => r.id !== suggestedRoutine.id).map(r => (
                    <button
                      key={r.id}
                      onClick={() => startWorkout(r.id)}
                      style={{
                        flexShrink: 0, minHeight: 40, padding: '0 14px', borderRadius: 12,
                        background: 'var(--surf2)', border: '1px solid var(--line2)',
                        color: 'var(--dim)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RoutineIcon routine={r} size={14} /> {r.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 16, padding: 20, border: '1.5px dashed var(--line2)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏋️</div>
              <p style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13 }}>¡Tu primera sesión te espera!</p>
              <button
                onClick={() => setActiveTab('rutinas')}
                style={{ color: 'var(--acc)', fontSize: 13, fontWeight: 600, marginTop: 8, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crear primera rutina →
              </button>
            </div>
          )}
        </div>

        {/* En qué semana del plan estás */}
        <ProgramCard />

        {/* La semana: un punto por día. Relleno = entrenado, aro = planificado. */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ background: 'var(--surf)', borderRadius: 16, border: '1px solid var(--line2)', padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }} role="list" aria-label="Esta semana">
              {semana.map((d) => {
                const estado = d.hecho ? 'entrenado' : d.planificado ? (d.pasado ? 'planificado, no se hizo' : 'planificado') : 'descanso'
                return (
                  <div key={d.letra} role="listitem" aria-label={`${d.letra}: ${estado}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: d.esHoy ? 700 : 500, color: d.esHoy ? 'var(--ink)' : 'var(--dim)' }}>{d.letra}</span>
                    <span style={{
                      width: 22, height: 22, borderRadius: 11, boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: d.hecho ? 'var(--good)' : 'transparent',
                      border: d.hecho ? 'none' : d.planificado ? `2px solid ${d.pasado ? 'var(--faint)' : 'var(--acc)'}` : 'none',
                    }}>
                      {!d.hecho && !d.planificado && <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--faint)' }} />}
                      {d.hecho && <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                Racha: <b className="num" style={{ color: 'var(--ink)', fontSize: 13 }}>{streak.current}</b> {streak.current === 1 ? 'entreno seguido' : 'entrenos seguidos'}
                {streak.atRisk && streak.current > 0 && <span style={{ color: 'var(--acc)' }}> · entrená hoy o mañana</span>}
              </span>
              {metaSemana > 0 && (
                <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                  <b className="num" style={{ color: 'var(--ink)' }}>{hechosSemana}</b> de <span className="num">{metaSemana}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desde el lunes, cómo fue la semana pasada */}
        <WeeklyReview />

        {/* Última sesión: una línea que abre el entreno en la Agenda */}
        {lastWorkout && lastRoutine && (
          <div style={{ padding: '12px 22px 0' }}>
            <button
              onClick={() => openAgendaDay(lastWorkout.startedAt)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                background: 'var(--surf)', borderRadius: 12, border: '1px solid var(--line2)',
                padding: '12px 14px', minHeight: 52, cursor: 'pointer', color: 'var(--ink)',
              }}
            >
              {lastRoutineVigente
                ? <RoutineIcon routine={lastRoutineVigente} size={14} />
                : <span style={{ fontSize: 17, flexShrink: 0 }}>{lastRoutine.emoji}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--dim)', fontWeight: 600 }}>Última sesión · {daysAgoStr}</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lastRoutine.name}
                  <span style={{ color: 'var(--dim)', fontWeight: 500 }}>
                    {' · '}<span className="num">{lastWorkout.durationMin ?? 0}</span> min · <span className="num">{lastTotalSets}</span> series
                    {lastRecords > 0 && <> · <span className="num" style={{ color: 'var(--acc2)' }}>{lastRecords}</span> {lastRecords === 1 ? 'récord' : 'récords'}</>}
                  </span>
                </span>
              </span>
              <span style={{ color: 'var(--mute)', fontSize: 17, flexShrink: 0 }} aria-hidden="true">›</span>
            </button>
          </div>
        )}

        {/* Series de la semana por músculo, contra la franja de 10 a 20 */}
        <WeeklyMuscleSets />

        {/* La copia de seguridad, abajo de todo y en una línea */}
        <BackupReminder />

        <div style={{ height: 24 }} />
      </div>

    </div>
  )
}
