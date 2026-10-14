import { useMemo } from 'react'
import { useStore, useAllExercises } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseThumbnail } from './ExerciseThumbnail'
import { S } from '../theme'
import { MuscleIcon } from './MuscleIcon'
import { formatKg } from '../utils/format'
import { formatDuration } from '../utils/duration'
import { recordKindFor, type RecordKind } from '../utils/records'



interface SessionEntry {
  date: number
  /** La mejor serie de la sesión, en la unidad del ejercicio. */
  best: SetValue
  totalSets: number
  sets: SetValue[]
}

interface SetValue { kg: number; reps: number; durationSec?: number }

/**
 * Cuánto pesa una serie según cómo se mide el ejercicio. Con kilos manda el
 * peso y a igual peso las reps; a peso corporal, las reps; por tiempo, los
 * segundos. Antes sólo contaban las series con kilos, y planchas, cinta y
 * abdominales decían "Todavía no registraste este ejercicio".
 */
function puntaje(kind: RecordKind, s: SetValue): number {
  if (kind === 'kg') return s.kg * 1000 + s.reps
  if (kind === 'reps') return s.reps
  return s.durationSec ?? 0
}

/** El valor que se grafica: kilos, reps o segundos. */
function valor(kind: RecordKind, s: SetValue): number {
  if (kind === 'kg') return s.kg
  if (kind === 'reps') return s.reps
  return s.durationSec ?? 0
}

function textoSerie(kind: RecordKind, s: SetValue): string {
  if (kind === 'tiempo') return formatDuration(s.durationSec ?? 0)
  if (kind === 'reps') return s.kg > 0 ? `${formatKg(s.kg)}kg × ${s.reps}` : `${s.reps} reps`
  return `${formatKg(s.kg)}×${s.reps}`
}

function textoValor(kind: RecordKind, v: number): string {
  if (kind === 'tiempo') return formatDuration(v)
  return kind === 'kg' ? formatKg(v) : String(v)
}

export function ExerciseHistorySheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const { workouts, prs } = useStore()
  const allExercises = useAllExercises()
  const exercise = allExercises.find((e) => e.id === exerciseId)
  const pr = prs.find((p) => p.exerciseId === exerciseId)

  const { sessions, kind } = useMemo(() => {
    const efectivas: SetValue[] = []
    for (const w of workouts) {
      if (!w.finishedAt) continue
      const wex = w.exercises.find((e) => e.exerciseId === exerciseId)
      if (wex) efectivas.push(...wex.sets.filter((s) => !s.isWarmup))
    }
    const kind = recordKindFor(exercise, efectivas)
    const entries: SessionEntry[] = []
    for (const w of workouts) {
      if (!w.finishedAt) continue
      const wex = w.exercises.find((e) => e.exerciseId === exerciseId)
      if (!wex) continue
      const working = wex.sets.filter((s) => !s.isWarmup && valor(kind, s) > 0)
      if (working.length === 0) continue
      const best = working.reduce((a, b) => (puntaje(kind, b) > puntaje(kind, a) ? b : a))
      entries.push({
        date: w.startedAt,
        best: { kg: best.kg, reps: best.reps, durationSec: best.durationSec },
        totalSets: working.length,
        sets: working.map((s) => ({ kg: s.kg, reps: s.reps, durationSec: s.durationSec })),
      })
    }
    return { sessions: entries.sort((a, b) => a.date - b.date), kind }
  }, [workouts, exerciseId, exercise])

  const unidad = kind === 'kg' ? 'kg' : kind === 'reps' ? 'reps' : ''
  const maxValor = Math.max(...sessions.map((s) => valor(kind, s.best)), 1)
  const firstValor = sessions[0] ? valor(kind, sessions[0].best) : 0
  const currentValor = sessions.length ? valor(kind, sessions[sessions.length - 1].best) : 0
  const change = currentValor - firstValor
  const textoRecord = !pr ? '—'
    : kind === 'tiempo' ? formatDuration(pr.durationSec ?? 0)
    : kind === 'reps' ? `${pr.reps}`
    : `${formatKg(pr.kg)}×${pr.reps}`
  const config = exercise ? muscleGroupConfig[exercise.muscleGroup] : null

  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div className="absolute inset-0 z-50 flex flex-col sheet-enter" style={{ background: S.bg }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '48px 20px 16px', borderBottom: `1px solid ${S.line2}` }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Volver"
            style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: S.surf2, border: `1px solid ${S.line2}`, color: S.dim,
              fontSize: 22, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ‹
          </button>
          {exercise && <ExerciseThumbnail exercise={exercise} size={40} />}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 17, fontWeight: 700, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exercise?.nameEs ?? 'Ejercicio'}
            </div>
            {config && (
              <div style={{ fontSize: 12, color: config.color, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                {exercise && <MuscleIcon group={exercise.muscleGroup} size={20} />} {config.label}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 scroll-area" style={{ padding: '16px 20px 32px' }}>
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="text-center">
              <p style={{ color: S.dim, fontSize: 13 }}>Todavía no registraste este ejercicio</p>
              <p style={{ color: S.mute, fontSize: 12, marginTop: 4 }}>Completá una serie para ver tu historial</p>
            </div>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="flex gap-2" style={{ marginBottom: 16 }}>
              <div style={{ flex: 1, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, color: S.ink }}>{textoValor(kind, currentValor)}<span style={{ fontSize: 12, color: S.dim, fontWeight: 500 }}>{unidad}</span></div>
                <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>Última vez</div>
              </div>
              <div style={{ flex: 1, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, color: S.acc2 }}>
                  {textoRecord}
                </div>
                <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>🏆 Récord</div>
              </div>
              <div style={{ flex: 1, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, color: change > 0 ? S.good : change < 0 ? S.bad : S.ink }}>
                  {change > 0 ? '+' : change < 0 ? '−' : ''}{textoValor(kind, Math.abs(change))}<span style={{ fontSize: 12, color: S.dim, fontWeight: 500 }}>{unidad}</span>
                </div>
                <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>Progreso</div>
              </div>
            </div>

            {/* Gráfico de tendencia (mejor kg por sesión) */}
            <div style={{ background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '16px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.ink, marginBottom: 12 }}>
                {kind === 'kg' ? 'Mejor peso por sesión' : kind === 'reps' ? 'Más reps por sesión' : 'Mejor tiempo por sesión'}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
                {sessions.slice(-16).map((s, i, arr) => {
                  const isLast = i === arr.length - 1
                  const v = valor(kind, s.best)
                  const h = Math.max(Math.round((v / maxValor) * 100), 8)
                  return (
                    <div key={s.date} className="flex-1 flex flex-col items-center justify-end" style={{ minWidth: 0 }} title={`${fmtDate(s.date)} · ${textoSerie(kind, s.best)}`}>
                      <div className="num" style={{ fontSize: 11, color: isLast ? S.ink : S.mute, fontWeight: 600, marginBottom: 3 }}>{kind === 'tiempo' ? Math.round(v) : textoValor(kind, v)}</div>
                      <div style={{
                        width: '100%', height: `${h}%`, minHeight: 4, borderRadius: '4px 4px 0 0',
                        background: isLast ? S.acc : 'rgba(232,99,74,0.28)', transition: 'height 0.4s ease',
                      }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lista de sesiones (más reciente primero) */}
            <div style={{ fontSize: 12, fontWeight: 700, color: S.dim, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Historial · {sessions.length} sesiones
            </div>
            <div className="flex flex-col gap-2">
              {[...sessions].reverse().map((s) => (
                <div key={s.date} style={{ background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '12px 14px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, textTransform: 'capitalize' }}>{fmtDate(s.date)}</span>
                    <span className="num" style={{ fontSize: 11, color: S.dim }}>
                      {kind === 'kg' ? `${formatKg(s.best.kg)}kg × ${s.best.reps}` : textoSerie(kind, s.best)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.sets.map((set, idx) => {
                      const isBest = puntaje(kind, set) === puntaje(kind, s.best)
                      return (
                        <span key={idx} className="num" style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8,
                          background: isBest ? 'rgba(232,99,74,0.15)' : S.surf2,
                          border: `1px solid ${isBest ? 'rgba(232,99,74,0.35)' : S.line2}`,
                          color: isBest ? S.acc : S.dim,
                        }}>
                          {textoSerie(kind, set)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
