import { useMemo, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { useStore } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseThumbnail } from '../components/ExerciseThumbnail'
import { ExerciseFrames } from '../components/ExerciseFrames'
import { MuscleBodyMap } from '../components/MuscleBodyMap'
import { draftFromName } from '../utils/exerciseMatch'
import type { MuscleGroup, Exercise } from '../types'
import { S } from '../theme'

const muscleGroups: MuscleGroup[] = [
  'pecho', 'espalda', 'hombros', 'biceps',
  'triceps', 'piernas', 'gluteos', 'core', 'cardio',
]

interface Props {
  onClose: () => void
}

export function CustomExercisesScreen({ onClose }: Props) {
  const { customExercises: todosLosPropios, routines, workouts, createCustomExercise, updateCustomExercise, deleteCustomExercise, restoreCustomExercise, addUndoToast } = useStore()
  // Los borrados quedan archivados para el historial, pero acá no se muestran.
  const customExercises = todosLosPropios.filter((e) => !e.archived)

  const [showForm, setShowForm] = useState(false)
  /** id del ejercicio que se está editando, o null si es uno nuevo. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameEs, setNameEs] = useState('')
  // El grupo se deduce del nombre hasta que el usuario elige uno a mano.
  const [groupOverride, setGroupOverride] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null)

  const draft = useMemo(() => draftFromName(nameEs.trim(), groupOverride ?? undefined), [nameEs, groupOverride])
  const muscleGroup = groupOverride ?? draft.group
  const setMuscleGroup = (mg: MuscleGroup) => setGroupOverride(mg)

  const resetForm = () => {
    setNameEs('')
    setEquipment('')
    setGroupOverride(null)
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id)
    setNameEs(ex.nameEs)
    setGroupOverride(ex.muscleGroup)
    setEquipment(ex.equipment ?? '')
    setShowForm(true)
  }

  const handleSubmit = () => {
    const trimmed = nameEs.trim()
    if (!trimmed) return
    if (editingId) {
      updateCustomExercise(editingId, { nameEs: trimmed, group: muscleGroup, equipment: equipment.trim() })
    } else {
      createCustomExercise(trimmed, { group: muscleGroup, equipment: equipment.trim() || undefined })
    }
    resetForm()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div
        className="flex-shrink-0 px-4 safe-top pb-4"
        style={{
          background: 'linear-gradient(180deg, var(--surf) 0%, var(--bg) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Volver"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-ink">Mis ejercicios</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {customExercises.length} propios · tocá uno para editarlo
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold btn-primary"
          >
            + Nuevo
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {customExercises.length === 0 && !showForm && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ border: '1.5px dashed rgba(232,99,74,0.2)', background: 'rgba(232,99,74,0.03)' }}
          >
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-ink font-semibold text-sm mb-1">Sin ejercicios personalizados</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Creá ejercicios propios y agregálos a tus rutinas</p>
          </div>
        )}

        {customExercises.map((ex) => {
          const config = muscleGroupConfig[ex.muscleGroup]
          return (
            <div
              key={ex.id}
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(160deg, var(--surf2) 0%, var(--surf) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 16px rgba(0,0,0,0.35)',
              }}
            >
              <button
                onClick={() => startEdit(ex)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                aria-label={`Editar ${ex.nameEs}`}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
              <ExerciseThumbnail exercise={ex} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm truncate">{ex.nameEs}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-micro px-1.5 py-0.5 rounded font-medium"
                    style={{ color: config.color, backgroundColor: config.color + '18' }}
                  >
                    {config.label}
                  </span>
                  {ex.equipment && (
                    <span className="text-micro" style={{ color: 'rgba(255,255,255,0.3)' }}>{ex.equipment}</span>
                  )}
                </div>
              </div>
              </button>
              <button
                onClick={() => setConfirmDelete(ex)}
                aria-label={`Eliminar ${ex.nameEs}`}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'rgba(239,68,68,0.7)',
                  fontSize: '16px',
                }}
              >
                ×
              </button>
            </div>
          )
        })}

        {showForm && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: 'linear-gradient(160deg, var(--surf2) 0%, var(--surf) 100%)',
              border: '1px solid rgba(232,99,74,0.2)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            <h3 className="text-ink font-bold text-sm">{editingId ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
            <p className="text-micro" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {editingId
                ? 'El historial y los récords se mantienen: sólo cambia cómo se muestra.'
                : 'Con el nombre alcanza: la app deduce grupo, equipamiento y dibujo. Podés corregir lo que quieras.'}
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-micro font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Nombre</label>
              <input
                autoFocus
                type="text"
                placeholder="Ej: Press de suelo"
                value={nameEs}
                onChange={(e) => setNameEs(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-ink text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-micro font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Grupo muscular</label>
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full rounded-xl px-3 py-2.5 text-ink text-sm appearance-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {muscleGroups.map((mg) => (
                  <option key={mg} value={mg} style={{ background: 'var(--surf)' }}>
                    {muscleGroupConfig[mg].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-micro font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Equipamiento (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Barra, Mancuernas, Polea..."
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-ink text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
            {nameEs.trim() && (
              <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: muscleGroupConfig[muscleGroup].color + '12' }}>
                  {draft.frameSlug
                    ? <ExerciseFrames slug={draft.frameSlug} size={44} alt={nameEs} animate />
                    : <MuscleBodyMap muscleGroup={muscleGroup} size={32} />}
                </div>
                <p className="text-micro flex-1 min-w-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {draft.frameSlug
                    ? <>Dibujo: <span className="text-ink">{draft.matchedName}</span> · {draft.equipment}</>
                    : 'Sin dibujo parecido: se usa el ícono del grupo muscular.'}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-1">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!nameEs.trim()}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm btn-primary disabled:opacity-40"
              >
                {editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (() => {
        const usedInRoutines = routines.filter(r => r.exercises.some(re => re.exerciseId === confirmDelete.id))
        const sesiones = workouts.filter(w => w.finishedAt && w.exercises.some(e => e.exerciseId === confirmDelete.id && e.sets.length > 0)).length
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setConfirmDelete(null)}>
            <Dialog label="Eliminar ejercicio" onClose={() => setConfirmDelete(null)}
              className="rounded-2xl p-6 w-full"
              style={{ background: S.surf, border: '1px solid rgba(255,255,255,0.12)', maxWidth: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-ink text-lg mb-2">¿Eliminar este ejercicio?</h3>
              <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <strong className="text-ink">{confirmDelete.nameEs}</strong> deja de aparecer para elegir.
                {sesiones > 0 && ` Las ${sesiones === 1 ? 'una sesión' : `${sesiones} sesiones`} que ya hiciste quedan en el historial.`}
              </p>
              {usedInRoutines.length > 0 && (
                <p className="text-xs mb-4" style={{ color: 'rgba(239,68,68,0.8)' }}>
                  También se quitará de {usedInRoutines.length === 1 ? 'la rutina' : 'las rutinas'}: {usedInRoutines.map(r => r.name).join(', ')}.
                </p>
              )}
              <div className="flex gap-3" style={{ marginTop: usedInRoutines.length > 0 ? 0 : 20 }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', background: 'none' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const ejercicio = confirmDelete
                    const rutinasAntes = usedInRoutines
                    deleteCustomExercise(ejercicio.id)
                    setConfirmDelete(null)
                    addUndoToast(`Eliminaste ${ejercicio.nameEs}`, () => restoreCustomExercise(ejercicio, rutinasAntes))
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ border: 'none', background: 'rgba(248,113,113,0.15)', color: S.bad }}
                >
                  Eliminar
                </button>
              </div>
            </Dialog>
          </div>
        )
      })()}
    </div>
  )
}
