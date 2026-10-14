import type { Exercise } from '../types'
import { muscleGroupConfig } from '../data/muscleGroups'
import { MuscleBodyMap } from './MuscleBodyMap'
import { ExerciseThumbnail } from './ExerciseThumbnail'
import { exerciseDetails } from '../data/exerciseDetails'
import { S } from '../theme'
import { MuscleIcon } from './MuscleIcon'

interface ExerciseModalProps {
  exercise: Exercise
  onClose: () => void
}


export function ExerciseModal({ exercise, onClose }: ExerciseModalProps) {
  const config = muscleGroupConfig[exercise.muscleGroup]
  const detail = exerciseDetails[exercise.id]
  const instructions = detail?.instructions ?? exercise.instructions ?? []
  const tips = detail?.tips ?? []
  const primaryMuscles = detail?.primaryMuscles ?? exercise.primaryMuscles ?? []
  const secondaryMuscles = detail?.secondaryMuscles ?? []

  return (
    <div
      className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-3xl max-h-[90vh] flex flex-col"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}` }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: S.faint }} />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-4 flex-shrink-0">
          <button
            onClick={onClose}
            style={{ color: S.dim, background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-8">
          {/* Exercise image — static, full width */}
          <div
            className="w-full rounded-2xl overflow-hidden flex items-center justify-center mb-5"
            style={{ background: config.color + '10', border: `1px solid ${config.color}25`, height: 200 }}
          >
            <ExerciseThumbnail
              exercise={exercise}
              size={200}
              rounded="rounded-none"
              forceStatic
              animate
            />
          </div>

          {/* Name + badges */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: S.ink, marginBottom: 10 }}>
            {exercise.nameEs}
          </h2>
          <div className="flex flex-wrap gap-2 mb-5">
            <span style={{ fontSize: 11, fontWeight: 600, color: config.color, background: config.color + '20', padding: '4px 10px', borderRadius: 24, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MuscleIcon group={exercise.muscleGroup} size={20} /> {config.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: S.dim, background: 'rgba(255,255,255,0.07)', padding: '4px 10px', borderRadius: 24 }}>
              {exercise.equipment}
            </span>
          </div>

          {/* Muscles + body map */}
          <div
            className="flex items-center gap-4 mb-5 rounded-2xl p-4"
            style={{ background: S.surf2, border: `1px solid ${S.line2}` }}
          >
            <MuscleBodyMap
              muscleGroup={exercise.muscleGroup}
              size={80}
              showBack={['piernas-05', 'piernas-06', 'piernas-10', 'piernas-12'].includes(exercise.id)}
            />
            <div className="flex-1 min-w-0">
              {primaryMuscles.length > 0 && (
                <div className="mb-2">
                  <p style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Principal</p>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryMuscles.map((m) => (
                      <span key={m} style={{ fontSize: 11, fontWeight: 600, color: config.color, background: config.color + '15', border: `1px solid ${config.color}30`, padding: '3px 8px', borderRadius: 8 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {secondaryMuscles.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Secundario</p>
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryMuscles.map((m) => (
                      <span key={m} style={{ fontSize: 11, color: S.dim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.line2}`, padding: '3px 8px', borderRadius: 8 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="mb-5">
              <p style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Instrucciones
              </p>
              <ol className="flex flex-col gap-3">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span
                      className="flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ width: 24, height: 24, borderRadius: '50%', background: config.color + '25', color: config.color, marginTop: 1 }}
                    >
                      {i + 1}
                    </span>
                    <p style={{ fontSize: 13, color: S.ink, lineHeight: 1.6, flex: 1 }}>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: S.surf2, border: `1px solid ${S.line2}` }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: S.mute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                💡 Tips
              </p>
              <ul className="flex flex-col gap-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span style={{ color: S.mute, fontSize: 13, flexShrink: 0 }}>•</span>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
