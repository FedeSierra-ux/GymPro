import { useEffect, useState } from 'react'
import { useStore, useAllExercises } from '../store/useStore'
import { isDurationExercise, formatDuration, totalSeconds } from '../utils/duration'
import { getWorkoutTip } from '../utils/aiCoach'
import type { NavTab, Workout } from '../types'
import { formatKg, formatLoad } from '../utils/format'
import { S } from '../theme'
import { RoutineIcon } from './RoutineIcon'
import { suggestNextWeight } from '../utils/progression'
import { rutinaEnUso } from '../utils/routineVariant'
import { routineColor } from '../utils/trainingDays'
import { seriesPorGrupo } from '../utils/volume'
import { compartirImagen, generarImagenEntreno } from '../utils/shareImage'

/**
 * Volumen de un entreno: kilos × reps de las series efectivas. Con `soloIds`,
 * sólo esos ejercicios (para comparar contra lo mismo que se hizo hoy).
 */
function volumenDe(w: Workout, soloIds?: Set<string>): number {
  return w.exercises
    .filter(e => !soloIds || soloIds.has(e.exerciseId))
    .reduce((a, e) => a + e.sets.filter(s => !s.isWarmup).reduce((b, s) => b + s.kg * s.reps, 0), 0)
}

function seriesDe(w: Workout, soloIds?: Set<string>): number {
  return w.exercises
    .filter(e => !soloIds || soloIds.has(e.exerciseId))
    .reduce((a, e) => a + e.sets.filter(s => !s.isWarmup).length, 0)
}

/** Diferencia con signo, lista para mostrar: "+3", "−5", "=" */
function delta(actual: number, antes: number, unidad = ''): { texto: string; signo: number } {
  const d = Math.round(actual - antes)
  if (d === 0) return { texto: '=', signo: 0 }
  return { texto: `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('es-AR')}${unidad}`, signo: Math.sign(d) }
}


interface Props {
  workout: Workout
  prCount: number
  onDismiss: (destino?: NavTab) => void
}

export function WorkoutSummaryModal({ workout, prCount, onDismiss }: Props) {
  const { routines, userName, workouts, anthropicApiKey } = useStore()
  const exercises = useAllExercises()
  const routine = routines.find(r => r.id === workout.routineId)

  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.filter(s => !s.isWarmup).length, 0)

  const topExercises = workout.exercises
    .map(we => {
      const ex = exercises.find(e => e.id === we.exerciseId)
      const workingSets = we.sets.filter(s => !s.isWarmup)
      const vol = workingSets.reduce((a, s) => a + s.kg * s.reps, 0)
      return { ex, vol, sets: workingSets }
    })
    .filter(e => e.ex && e.vol > 0)
    .sort((a, b) => b.vol - a.vol)
    .slice(0, 3)

  const [aiTip, setAiTip] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(!!anthropicApiKey)
  const [aiError, setAiError] = useState(false)

  useEffect(() => {
    if (!anthropicApiKey) return
    let cancelled = false
    const recentFinished = workouts
      .filter(w => w.finishedAt && w.routineId === workout.routineId && w.id !== workout.id)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 4)
    const recentTrend = recentFinished.length > 0
      ? `Últimas ${recentFinished.length} sesiones de esta rutina: ${recentFinished.map(w => `${w.durationMin ?? 0}min/${w.exercises.reduce((a, e) => a + e.sets.length, 0)}series`).join(', ')}`
      : 'Primera vez registrando esta rutina.'
    const exerciseSummaries = workout.exercises.map(we => {
      const ex = exercises.find(e => e.id === we.exerciseId)
      const best = we.sets.reduce((a, s) => (s.kg > a.kg ? s : a), we.sets[0])
      return `${ex?.nameEs ?? we.exerciseId}: ${we.sets.length} series, mejor ${formatKg(best?.kg ?? 0)}kg x ${best?.reps ?? 0}`
    })
    getWorkoutTip(anthropicApiKey, {
      routineName: routine?.name ?? 'Sesión',
      durationMin: workout.durationMin ?? 0,
      totalSets,
      newPrCount: prCount,
      exerciseSummaries,
      recentTrend,
    })
      .then(tip => { if (!cancelled) { setAiTip(tip); setAiLoading(false) } })
      .catch(() => { if (!cancelled) { setAiError(true); setAiLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id, anthropicApiKey])

  // Contra la vez anterior de esta misma rutina: ¿fue mejor o peor que la última?
  const anterior = workouts
    .filter(w => w.finishedAt && w.routineId === workout.routineId && w.id !== workout.id && w.startedAt < workout.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  // Comparación justa: sólo los ejercicios que se hicieron hoy. Si cortaste
  // antes, no se compara contra la sesión entera.
  const hechosHoy = new Set(workout.exercises.filter(e => e.sets.some(s => !s.isWarmup)).map(e => e.exerciseId))
  const sinHacer = routine
    ? rutinaEnUso(routine).exercises.filter(re => !hechosHoy.has(re.exerciseId))
    : []
  const nombreDe = (id: string) => exercises.find(e => e.id === id)?.nameEs ?? id
  const volumen = volumenDe(workout)
  const volumenAntes = anterior ? volumenDe(anterior, hechosHoy) : 0
  const seriesAntes = anterior ? seriesDe(anterior, hechosHoy) : 0
  const filas: { label: string; valor: string; antes?: string; d?: { texto: string; signo: number } }[] = [
    {
      label: 'Volumen', valor: `${Math.round(volumen).toLocaleString('es-AR')} kg`,
      antes: anterior ? `${Math.round(volumenAntes).toLocaleString('es-AR')} kg` : undefined,
      d: anterior ? delta(volumen, volumenAntes, ' kg') : undefined,
    },
    {
      label: 'Series', valor: String(totalSets),
      antes: anterior ? String(seriesAntes) : undefined,
      d: anterior ? delta(totalSets, seriesAntes) : undefined,
    },
    {
      label: 'Duración', valor: `${workout.durationMin ?? 0} min`,
      antes: anterior ? `${anterior.durationMin ?? 0} min` : undefined,
      // Menos tiempo para lo mismo no es peor: la duración va sin color.
      d: anterior ? { ...delta(workout.durationMin ?? 0, anterior.durationMin ?? 0, ' min'), signo: 0 } : undefined,
    },
  ]
  const fechaAnterior = anterior
    ? new Date(anterior.startedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : null

  // La próxima subís: la doble progresión, ya con este entreno en el historial.
  // Antes eran avisos flotantes que tapaban el título del resumen.
  const subir = routine
    ? rutinaEnUso(routine).exercises.flatMap(re => {
        const ex = exercises.find(e => e.id === re.exerciseId)
        const sug = suggestNextWeight(ex, re, workouts, re.exerciseId)
        return sug && sug.reason === 'subir' && hechosHoy.has(re.exerciseId)
          ? [{ id: re.exerciseId, nombre: ex?.nameEs ?? re.exerciseId, kg: sug.kg }]
          : []
      })
    : []

  // Imagen para compartir: rutina, cifras, récords y el mapa de lo trabajado.
  const [compartiendo, setCompartiendo] = useState(false)
  const compartir = async () => {
    setCompartiendo(true)
    try {
      const grupos = seriesPorGrupo([workout], exercises, workout.startedAt, workout.startedAt + 1)
      const tope = Math.max(1, ...grupos.values())
      const niveles = Object.fromEntries([...grupos].map(([g, n]) => [g, Math.max(0.35, n / tope)]))
      const blob = await generarImagenEntreno({
        rutina: routine?.name ?? 'Entreno',
        fecha: workout.startedAt,
        color: routineColor(workout.routineId, routines),
        duracionMin: workout.durationMin ?? 0,
        series: totalSets,
        volumenKg: volumen,
        records: prCount,
        niveles,
        ejercicios: topExercises.map(({ ex, sets }) => {
          const best = sets.reduce((a, st) => (st.kg > a.kg ? st : a), sets[0])
          return { nombre: ex!.nameEs, detalle: `${formatKg(best.kg)} × ${best.reps}` }
        }),
      })
      await compartirImagen(blob, `gympro-${new Date(workout.startedAt).toISOString().slice(0, 10)}.png`)
    } catch {
      useStore.getState().addToast('No se pudo armar la imagen', 'info')
    } finally {
      setCompartiendo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div
        className="w-full rounded-t-3xl flex flex-col sheet-enter overflow-y-auto"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, maxHeight: '88vh' }}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '14px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div className="text-center px-6 pt-5 pb-4" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {routine ? <RoutineIcon routine={routine} size={30} boxed /> : <span style={{ fontSize: 52, lineHeight: 1 }}>🏋️</span>}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: S.ink, letterSpacing: -0.5 }}>
            ¡Entreno completado!
          </div>
          <div style={{ fontSize: 13, color: S.dim, marginTop: 5 }}>
            {routine?.name ?? 'Sesión'}
            {userName ? ` · Buen trabajo, ${userName}` : ''}
          </div>
        </div>

        {/* Contra la vez anterior de esta rutina */}
        <div style={{ margin: '0 20px 16px', flexShrink: 0, background: S.surf2, borderRadius: 16, border: `1px solid ${S.line2}`, padding: '4px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, alignItems: 'baseline', padding: '8px 0 6px', borderBottom: `1px solid ${S.line}` }}>
            <span style={{ fontSize: 11, color: S.mute, fontWeight: 600 }}>
              {fechaAnterior ? `Contra el ${fechaAnterior}${sinHacer.length ? ', mismos ejercicios' : ''}` : 'Primera vez con esta rutina'}
            </span>
            <span style={{ fontSize: 11, color: S.mute, fontWeight: 600, textAlign: 'right' }}>Hoy</span>
            <span style={{ fontSize: 11, color: S.mute, fontWeight: 600, textAlign: 'right', minWidth: 64 }}>{anterior ? 'Diferencia' : ''}</span>
          </div>
          {filas.map(f => (
            <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${S.line}` }}>
              <span style={{ fontSize: 13, color: S.dim }}>{f.label}</span>
              <span className="num" style={{ fontSize: 15, fontWeight: 700, color: S.ink, textAlign: 'right' }}>{f.valor}</span>
              <span className="num" style={{
                fontSize: 13, fontWeight: 700, textAlign: 'right', minWidth: 64,
                color: !f.d || f.d.signo === 0 ? S.dim : f.d.signo > 0 ? S.good : S.bad,
              }}>
                {f.d?.texto ?? ''}
              </span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, alignItems: 'baseline', padding: '9px 0 8px' }}>
            <span style={{ fontSize: 13, color: S.dim }}>Récords</span>
            <span className="num" style={{ fontSize: 15, fontWeight: 700, color: prCount > 0 ? S.acc2 : S.ink, textAlign: 'right' }}>{prCount}</span>
            <span style={{ minWidth: 64 }} />
          </div>
          {sinHacer.length > 0 && (
            <p style={{ fontSize: 12, color: S.dim, padding: '0 0 10px', lineHeight: 1.4 }}>
              <span className="num" style={{ color: S.ink, fontWeight: 700 }}>{sinHacer.length}</span>
              {sinHacer.length === 1 ? ' ejercicio sin hacer: ' : ' ejercicios sin hacer: '}
              {sinHacer.map(re => nombreDe(re.exerciseId)).join(', ')}
            </p>
          )}
        </div>

        {/* La próxima subís */}
        {subir.length > 0 && (
          <div style={{ margin: '0 20px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              La próxima subís
            </div>
            <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 16, padding: '4px 14px' }}>
              {subir.map((x, i) => (
                <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '9px 0', borderTop: i ? `1px solid ${S.line}` : 'none' }}>
                  <span style={{ fontSize: 13, color: S.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.nombre}</span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: S.good, flexShrink: 0 }}>▲ {formatKg(x.kg)} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PR banner */}
        {prCount > 0 && (
          <div style={{
            margin: '0 20px 16px', flexShrink: 0,
            background: 'rgba(242,169,59,0.10)', border: `1px solid rgba(242,169,59,0.28)`,
            borderRadius: 16, padding: '13px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.acc2 }}>
                {prCount === 1 ? '¡Nuevo récord personal!' : `¡${prCount} nuevos récords!`}
              </div>
              <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>Actualizados en tus récords</div>
            </div>
          </div>
        )}

        {/* AI Coach tip */}
        {anthropicApiKey && (aiLoading || aiTip) && !aiError && (
          <div style={{
            margin: '0 20px 16px', flexShrink: 0,
            background: 'rgba(232,99,74,0.08)', border: `1px solid rgba(232,99,74,0.22)`,
            borderRadius: 16, padding: '13px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.acc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coach IA</div>
              <div style={{ fontSize: 13, color: S.ink, marginTop: 3, lineHeight: 1.4 }}>
                {aiLoading ? 'Analizando tu entreno...' : aiTip}
              </div>
            </div>
          </div>
        )}

        {/* Top exercises */}
        {topExercises.length > 0 && (
          <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Ejercicios destacados
            </div>
            <div className="flex flex-col gap-2">
              {topExercises.map(({ ex, sets, vol }) => {
                if (!ex) return null
                const best = sets.reduce((a, s) => s.kg > a.kg ? s : a, sets[0])
                const byTime = isDurationExercise(ex)
                return (
                  <div key={ex.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: S.surf2, borderRadius: 12, padding: '10px 14px',
                    border: `1px solid ${S.line2}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>{ex.nameEs}</div>
                      <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
                        {byTime
                          ? `${sets.length} × ${formatDuration(totalSeconds(sets) / Math.max(1, sets.length))} · total ${formatDuration(totalSeconds(sets))}`
                          : `${sets.length} series · mejor: ${formatLoad(best.kg, best.reps)}`}
                      </div>
                    </div>
                    {!byTime && (
                      <div className="num" style={{ fontSize: 12, fontWeight: 700, color: S.dim, flexShrink: 0 }}>
                        {Math.round(vol).toLocaleString('es-AR')} kg
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Compartir el entreno como imagen para historias */}
        <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
          <button
            onClick={compartir}
            disabled={compartiendo}
            style={{
              width: '100%', minHeight: 48, borderRadius: 12, background: 'none',
              border: `1px solid ${S.line2}`, color: S.ink, fontSize: 15, fontWeight: 600,
              cursor: compartiendo ? 'wait' : 'pointer',
            }}
          >
            {compartiendo ? 'Armando la imagen…' : 'Compartir imagen ↗'}
          </button>
        </div>

        {/* CTA — dos salidas, y cada una va adonde dice */}
        <div style={{ padding: '4px 20px 48px', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button
            onClick={() => onDismiss('home')}
            style={{
              flex: 1, minHeight: 54, borderRadius: 16,
              background: S.surf2, border: `1px solid ${S.line2}`, color: S.ink,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Listo
          </button>
          <button
            onClick={() => onDismiss('progreso')}
            style={{
              flex: 1.4, minHeight: 54, borderRadius: 16,
              background: S.acc,
              border: 'none', color: S.onAcc,
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            Ver mi progreso →
          </button>
        </div>
      </div>
    </div>
  )
}
