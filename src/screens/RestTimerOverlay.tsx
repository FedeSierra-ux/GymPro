import { useAllExercises, useStore } from '../store/useStore'
import { useWorkoutStore } from '../stores/workoutStore'
import { formatKg, formatLoad } from '../utils/format'
import { parseDecimal } from '../utils/numberInput'
import { durationUnit, isDurationExercise } from '../utils/duration'
import { S } from '../theme'
import { agruparEntreno, grupoPorEjercicio, proximaSerie } from '../utils/bloques'

const PRESETS = [
  { label: '0:45', seconds: 45 },
  { label: '1:00', seconds: 60 },
  { label: '1:15', seconds: 75 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RestTimerOverlay({ onMinimize }: { onMinimize?: () => void }) {
  const exercises = useAllExercises()
  const routines = useStore((s) => s.routines)
  const {
    activeWorkout,
    dismissRestTimer,
    adjustRestTimer,
    setRestPreset,
  } = useWorkoutStore()

  if (!activeWorkout) return null

  const { restSecondsLeft, restTotalSeconds, lastCompletedSet } = activeWorkout
  const progress = restTotalSeconds > 0 ? (restSecondsLeft / restTotalSeconds) * 100 : 0
  const size = 200
  const strokeWidth = 10
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  const lastExercise = lastCompletedSet
    ? exercises.find((e) => e.id === lastCompletedSet.exerciseId)
    : null

  const nextExercise = (() => {
    if (!lastCompletedSet) return null
    const exIdx = activeWorkout.exercises.findIndex((e) => e.exerciseId === lastCompletedSet.exerciseId)
    if (exIdx < 0) return null
    const currentEx = activeWorkout.exercises[exIdx]
    if (!currentEx) return null
    // En un circuito o superserie lo que sigue va por rondas (A2 después de C1).
    const rutina = routines.find((r) => r.id === activeWorkout.routineId)
    const bloques = agruparEntreno(activeWorkout.exercises, rutina?.exercises ?? [])
    const grupo = grupoPorEjercicio(bloques).get(exIdx)
    if (grupo && grupo.tipo !== 'suelto') {
      const p = proximaSerie(activeWorkout.exercises, bloques, exIdx)
      if (p) {
        const ej = activeWorkout.exercises[p.exIdx]
        return { exercise: exercises.find((e) => e.id === ej.exerciseId), setNum: p.setIdx + 1, set: ej.sets[p.setIdx] }
      }
    }
    const nextSetInSame = currentEx.sets.findIndex((s, i) => i > lastCompletedSet.setIdx && !s.completed)
    if (nextSetInSame >= 0) {
      return { exercise: exercises.find((e) => e.id === lastCompletedSet.exerciseId), setNum: nextSetInSame + 1, set: currentEx.sets[nextSetInSame] }
    }
    const nextEx = activeWorkout.exercises[exIdx + 1]
    if (nextEx) {
      const idx = Math.max(0, nextEx.sets.findIndex((s) => !s.completed))
      return { exercise: exercises.find((e) => e.id === nextEx.exerciseId), setNum: idx + 1, set: nextEx.sets[idx] }
    }
    return null
  })()

  return (
    // bg-background/97 no existe en la escala de opacidades de Tailwind 3: la
    // clase no se generaba y el panel quedaba transparente sobre el entreno.
    <div role="dialog" aria-modal="true" aria-label="Descanso" className="absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-between py-8 z-50 sheet-enter" style={{ background: 'rgba(12,14,20,0.97)' }}>
      <div className="text-center flex flex-col items-center gap-2">
        <p className="text-dim font-bold text-sm tracking-widest uppercase">Descanso</p>
        {onMinimize && (
          <button onClick={onMinimize}
            style={{ minHeight: 40, padding: '0 14px', borderRadius: 12, background: 'none', border: '1px solid rgba(236,238,244,0.12)', color: S.dim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Ver el entreno ↓
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={S.line2}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={restSecondsLeft <= 10 ? S.good : S.acc}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.8s linear',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-hero font-bold text-ink font-mono${restSecondsLeft <= 3 ? ' late' : ''}`}>{formatTime(restSecondsLeft)}</span>
          </div>
        </div>

        {lastCompletedSet && lastExercise && (
          <div className="text-center">
            <p className="text-sm text-dim">
              Serie {lastCompletedSet.setIdx + 1} completada · {lastExercise.nameEs}
            </p>
            <p className="text-ink font-semibold text-lg">
              {/* Los ejercicios por tiempo decían "0 reps". */}
              {isDurationExercise(lastExercise)
                ? `${(activeWorkout.exercises.find((e) => e.exerciseId === lastCompletedSet.exerciseId)?.sets[lastCompletedSet.setIdx]?.duration ?? '').replace('.', ',')} ${durationUnit(lastExercise) === 'min' ? 'min' : 's'}`
                : formatLoad(lastCompletedSet.kg, lastCompletedSet.reps)}
            </p>
          </div>
        )}

        {nextExercise && nextExercise.exercise && (
          <div className="bg-card border border-border rounded-xl px-6 py-3 text-center">
            <p className="text-micro text-mute uppercase tracking-wider">Siguiente</p>
            <p className="text-ink font-semibold text-sm mt-0.5">{nextExercise.exercise.nameEs}</p>
            <p className="text-dim text-xs">Serie {nextExercise.setNum}</p>
            {/* Qué peso y reps tocan, para preparar la barra durante el descanso */}
            {nextExercise.set && (isDurationExercise(nextExercise.exercise)
              ? nextExercise.set.duration && (
                <p className="num text-ink font-bold" style={{ fontSize: 17, marginTop: 4 }}>
                  {nextExercise.set.duration.replace('.', ',')} {durationUnit(nextExercise.exercise) === 'min' ? 'min' : 's'}
                </p>
              )
              : (nextExercise.set.reps || nextExercise.set.kg) && (
                <p className="num text-ink font-bold" style={{ fontSize: 17, marginTop: 4 }}>
                  {parseDecimal(nextExercise.set.kg) > 0 ? `${formatKg(parseDecimal(nextExercise.set.kg))} × ` : ''}{nextExercise.set.reps || '—'}
                </p>
              ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 w-full px-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => adjustRestTimer(-30)}
            className="w-14 h-14 rounded-full bg-surface border border-border text-ink text-sm font-semibold transition-colors"
          >
            −30s
          </button>
          <button
            onClick={dismissRestTimer}
            className="px-8 py-3 bg-primary text-on-acc font-bold rounded-xl active:scale-95 transition-transform"
          >
            Saltar →
          </button>
          <button
            onClick={() => adjustRestTimer(30)}
            className="w-14 h-14 rounded-full bg-surface border border-border text-ink text-sm font-semibold transition-colors"
          >
            +30s
          </button>
        </div>

        {/* Los seis en una fila: si se parten en dos, la segunda queda encima del botón de terminar. */}
        <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${PRESETS.length}, minmax(0, 1fr))`, gap: 6, maxWidth: 360 }}>
          {PRESETS.map((p) => (
            <button
              key={p.seconds}
              onClick={() => setRestPreset(p.seconds)}
              aria-pressed={restTotalSeconds === p.seconds}
              style={{ minHeight: 44 }}
              className={`num py-2 rounded-full text-sm font-medium transition-colors border ${
                restTotalSeconds === p.seconds
                  ? 'bg-surface text-primary border-primary'
                  : 'bg-surface border-border text-dim'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
