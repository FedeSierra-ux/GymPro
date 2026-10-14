import { useState, useCallback, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseModal } from '../components/ExerciseModal'
import { ExerciseThumbnail } from '../components/ExerciseThumbnail'
import { CreateExerciseCard } from '../components/CreateExerciseCard'
import { getExerciseSuggestion } from '../utils/aiCoach'
import type { MuscleGroup, Exercise } from '../types'
import { MuscleIcon } from '../components/MuscleIcon'
import { S } from '../theme'

interface Props {
  routineName: string
}

const muscleGroupOrder: MuscleGroup[] = [
  'pecho', 'espalda', 'hombros',
  'biceps', 'triceps', 'piernas',
  'gluteos', 'core', 'cardio',
]

export function ExercisePickerScreen({ routineName }: Props) {
  const { exercises, customExercises, activeRoutineId, routines, addExerciseToRoutine, setShowExercisePicker, anthropicApiKey } = useStore()
  // Los ejercicios propios borrados (archivados) no se ofrecen para agregar.
  const allExercises = useMemo(() => [...exercises, ...customExercises.filter((e) => !e.archived)], [exercises, customExercises])
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [mode, setMode] = useState<'browse' | 'search'>('browse')
  const [aiSuggestion, setAiSuggestion] = useState<{ exercise: Exercise; reason: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)

  const routine = routines.find((r) => r.id === activeRoutineId)
  const addedIds = useMemo(
    () => new Set(routine?.exercises.map((e) => e.exerciseId) ?? []),
    [routine?.exercises]
  )

  const handleAdd = useCallback((exerciseId: string) => {
    if (activeRoutineId && !addedIds.has(exerciseId)) {
      addExerciseToRoutine(activeRoutineId, exerciseId)
    }
  }, [activeRoutineId, addedIds, addExerciseToRoutine])

  const handleAiSuggest = async () => {
    if (!anthropicApiKey || !routine) return
    setAiLoading(true)
    setAiError(false)
    setAiSuggestion(null)
    try {
      // La lista entera: cortarla en 60 dejaba afuera los ejercicios propios
      // (van al final) y los últimos del catálogo, entre ellos los del plan de Mile.
      const candidates = allExercises.filter(ex => !addedIds.has(ex.id))
      const currentNames = routine.exercises
        .map(re => allExercises.find(e => e.id === re.exerciseId)?.nameEs)
        .filter(Boolean) as string[]
      const result = await getExerciseSuggestion(
        anthropicApiKey,
        routine.name,
        currentNames,
        candidates.map(c => ({ id: c.id, nameEs: c.nameEs, muscleGroup: c.muscleGroup, equipment: c.equipment }))
      )
      const ex = result.exerciseId ? allExercises.find(e => e.id === result.exerciseId) : null
      if (ex) setAiSuggestion({ exercise: ex, reason: result.reason })
      else setAiError(true)
    } catch {
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  // Search mode: filter by query (and optionally group)
  const searchFiltered = mode === 'search' ? allExercises.filter((ex) => {
    const matchGroup = !selectedGroup || ex.muscleGroup === selectedGroup
    const q = search.toLowerCase()
    const matchSearch = !search
      || ex.nameEs.toLowerCase().includes(q)
      || (ex.nameArg ?? '').toLowerCase().includes(q)
      || (ex.nameEn ?? '').toLowerCase().includes(q)
    return matchGroup && matchSearch
  }) : []

  // Sólo ofrecemos crearlo si no existe ya uno con ese mismo nombre.
  const canCreate = mode === 'search'
    && search.trim().length >= 2
    && !allExercises.some(ex => ex.nameEs.trim().toLowerCase() === search.trim().toLowerCase())

  // Browse mode: group by muscle
  const groupedExercises = mode === 'browse'
    ? muscleGroupOrder
        .filter(mg => !selectedGroup || mg === selectedGroup)
        .map(mg => ({
          group: mg,
          config: muscleGroupConfig[mg],
          exercises: allExercises.filter(ex => ex.muscleGroup === mg),
        }))
    : []

  return (
    <div className="flex-1 min-h-0 flex flex-col screen-enter" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 safe-top pb-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--surf) 0%, var(--bg) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setShowExercisePicker(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
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
          <div>
            <h1 className="text-base font-bold text-ink">Elegir ejercicio</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{routineName}</p>
          </div>
          <div
            className="ml-auto flex rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
          >
            <button
              onClick={() => setMode('browse')}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={mode === 'browse' ? {
                background: 'rgba(232,99,74,0.15)',
                color: 'var(--acc)',
              } : { color: 'rgba(255,255,255,0.3)' }}
            >
              Grupos
            </button>
            <button
              onClick={() => { setMode('search') }}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={mode === 'search' ? {
                background: 'rgba(232,99,74,0.15)',
                color: 'var(--acc)',
              } : { color: 'rgba(255,255,255,0.3)' }}
            >
              Buscar
            </button>
          </div>
        </div>

        {mode === 'search' && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar o escribir uno nuevo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded-xl py-2.5 pl-9 pr-4 text-ink text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>
        )}
      </div>

      {/* AI suggestion */}
      {anthropicApiKey && (
        <div className="flex-shrink-0 px-4 pt-3">
          {aiSuggestion ? (
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(232,99,74,0.08)', border: '1px solid rgba(232,99,74,0.22)' }}>
              <span className="text-xl flex-shrink-0">🤖</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{aiSuggestion.exercise.nameEs}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{aiSuggestion.reason}</p>
              </div>
              <button
                onClick={() => { handleAdd(aiSuggestion.exercise.id); setAiSuggestion(null) }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-on-acc flex-shrink-0"
                style={{ background: 'var(--acc)' }}
              >
                + Agregar
              </button>
            </div>
          ) : (
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className="w-full rounded-2xl p-3 flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: 'rgba(232,99,74,0.08)', border: '1px solid rgba(232,99,74,0.22)', color: 'var(--acc)' }}
            >
              🤖 {aiLoading ? 'Pensando...' : aiError ? 'No se pudo sugerir, reintentar' : 'Sugerir ejercicio con IA'}
            </button>
          )}
        </div>
      )}

      {/* Group filter pills — show in both modes */}
      <div className="flex-shrink-0 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedGroup(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !selectedGroup ? 'bg-primary/20 text-primary border-primary/40' : 'bg-surface text-dim border-border'
            }`}
          >
            Todos
          </button>
          {muscleGroupOrder.map((mg) => {
            const cfg = muscleGroupConfig[mg]
            const isSelected = selectedGroup === mg
            return (
              <button
                key={mg}
                onClick={() => setSelectedGroup(isSelected ? null : mg)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-1"
                style={{
                  backgroundColor: isSelected ? cfg.color + '25' : S.surf,
                  borderColor: isSelected ? cfg.color + '60' : S.line2,
                  color: isSelected ? cfg.color : S.mute,
                }}
              >
                <MuscleIcon group={mg} size={20} color={isSelected ? cfg.color : S.mute} /> {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 scroll-area px-4 py-3 pb-6">
        {mode === 'search' ? (
          <div className="flex flex-col gap-2">
            {/* Ejercicio a mano: si lo que escribiste no existe, se crea al toque
                con el nombre tal cual, y queda para seguirlo como cualquier otro. */}
            {canCreate && (
              <CreateExerciseCard
                name={search}
                groupHint={selectedGroup ?? undefined}
                onCreated={(ex) => { handleAdd(ex.id); setSearch('') }}
              />
            )}
            {searchFiltered.map(ex => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                isAdded={addedIds.has(ex.id)}
                onAdd={() => handleAdd(ex.id)}
                onDetail={() => setDetailExercise(ex)}
              />
            ))}
            {searchFiltered.length === 0 && search && !canCreate && (
              <div className="text-center py-8">
                <p className="text-dim text-sm">Sin resultados para "{search}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedExercises.map(({ group, config, exercises: exs }) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <MuscleIcon group={group} size={26} />
                  <h3 className="font-bold text-sm text-ink">{config.label}</h3>
                  <span
                    className="text-micro px-1.5 py-0.5 rounded font-medium"
                    style={{ color: config.color, backgroundColor: config.color + '15' }}
                  >
                    {exs.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {exs.map(ex => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      isAdded={addedIds.has(ex.id)}
                      onAdd={() => handleAdd(ex.id)}
                      onDetail={() => setDetailExercise(ex)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise detail modal */}
      {detailExercise && (
        <ExerciseModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  )
}

function ExerciseRow({
  exercise,
  isAdded,
  onAdd,
  onDetail,
}: {
  exercise: Exercise
  isAdded: boolean
  onAdd: () => void
  onDetail: () => void
}) {
  return (
    <div
      className="rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all"
      style={{
        background: 'linear-gradient(160deg, var(--surf2) 0%, var(--surf) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Tapping icon/name → detail */}
      <button
        onClick={onDetail}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <ExerciseThumbnail exercise={exercise} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink text-sm truncate">{exercise.nameEs}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{exercise.primaryMuscles.join(', ')}</p>
        </div>
      </button>

      {/* Add button */}
      <button
        onClick={onAdd}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all font-bold text-lg"
        style={isAdded ? {
          background: 'rgba(232,99,74,0.15)',
          color: 'var(--acc)',
          border: '1px solid rgba(232,99,74,0.3)',
        } : {
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {isAdded ? '✓' : '+'}
      </button>
    </div>
  )
}
