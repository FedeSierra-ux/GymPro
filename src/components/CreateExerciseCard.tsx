import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { draftFromName } from '../utils/exerciseMatch'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseFrames } from './ExerciseFrames'
import { MuscleBodyMap } from './MuscleBodyMap'
import { vibrate } from '../utils/haptics'
import type { Exercise, MuscleGroup } from '../types'
import { MuscleIcon } from './MuscleIcon'

interface Props {
  /** Lo que escribió el usuario. */
  name: string
  /** Grupo elegido a mano; si no hay, se deduce del nombre. */
  groupHint?: MuscleGroup
  onCreated: (exercise: Exercise) => void
  label?: string
}

/**
 * Tarjeta "crear este ejercicio" que aparece mientras se escribe un nombre que
 * no está en la lista. Muestra en vivo el grupo muscular, el equipamiento y la
 * ilustración que la app dedujo, así el usuario ve qué va a quedar guardado
 * antes de tocar el botón.
 */
export function CreateExerciseCard({ name, groupHint, onCreated, label = 'Crear y agregar' }: Props) {
  const createCustomExercise = useStore(s => s.createCustomExercise)
  const addToast = useStore(s => s.addToast)
  const trimmed = name.trim()
  const draft = useMemo(() => draftFromName(trimmed, groupHint), [trimmed, groupHint])

  if (!trimmed) return null
  const config = muscleGroupConfig[draft.group]

  const handleCreate = () => {
    const ex = createCustomExercise(trimmed, groupHint ? { group: groupHint } : undefined)
    if (!ex) return
    vibrate(30)
    addToast(`"${ex.nameEs}" listo para seguir`, 'success')
    onCreated(ex)
  }

  return (
    <div
      className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: 'rgba(232,99,74,0.06)',
        border: '1.5px dashed rgba(232,99,74,0.35)',
      }}
    >
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ width: 44, height: 44, background: config.color + '12' }}
      >
        {draft.frameSlug
          ? <ExerciseFrames slug={draft.frameSlug} size={44} alt={trimmed} />
          : <MuscleBodyMap muscleGroup={draft.group} size={32} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{trimmed}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className="text-micro px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"
            style={{ color: config.color, backgroundColor: config.color + '18' }}
          >
            <MuscleIcon group={draft.group} size={18} /> {config.label}
          </span>
          <span className="text-micro" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {draft.equipment}
          </span>
          {draft.frameSlug && (
            <span className="text-micro" style={{ color: 'rgba(255,255,255,0.25)' }}>
              · dibujo: {draft.matchedName}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="px-3 py-2 rounded-xl text-xs font-bold text-on-acc flex-shrink-0"
        style={{ background: 'var(--acc)' }}
      >
        {label}
      </button>
    </div>
  )
}
