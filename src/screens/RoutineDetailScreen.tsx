import { useState, useCallback } from 'react'
import { Dialog } from '../components/Dialog'
import { useStore, useAllExercises } from '../store/useStore'
import { useWorkoutStore } from '../stores/workoutStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExercisePickerScreen } from './ExercisePickerScreen'
import { ExerciseThumbnail } from '../components/ExerciseThumbnail'
import { CreateExerciseCard } from '../components/CreateExerciseCard'
import { isDurationExercise, durationUnit, formatDuration, fromSeconds, toSeconds } from '../utils/duration'
import type { Routine, RoutineExercise } from '../types'
import { ejercicioEnUso, rutinaEnUso, tieneVariante, VARIANTE_LABEL } from '../utils/routineVariant'
import { posicionEnSuperserie, separarDelSiguiente, unirConSiguiente } from '../utils/superset'
import { S } from '../theme'
import { RoutineBadge } from '../components/RoutineIcon'
import { DraftNumberInput } from '../components/DraftNumberInput'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export function RoutineDetailScreen() {
  const {
    activeRoutineId,
    routines,
    workouts,
    setActiveRoutineId,
    removeExerciseFromRoutine,
    updateRoutine,
    deleteRoutine,
    reorderRoutineExercises,
    showExercisePicker,
    setShowExercisePicker,
    addExerciseToRoutine,
    createCustomExercise,
    addToast,
  } = useStore()
  const exercises = useAllExercises()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)

  const [editMode, setEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [quickName, setQuickName] = useState('')
  // Ejercicio cuyo menú de bloque/superserie está abierto (modo edición).
  const [opcionesDe, setOpcionesDe] = useState<string | null>(null)

  const routine = routines.find((r) => r.id === activeRoutineId)

  const updateExerciseConfig = useCallback((exerciseId: string, patch: Partial<Routine['exercises'][0]>) => {
    if (!routine) return
    updateRoutine({
      ...routine,
      exercises: routine.exercises.map(re =>
        re.exerciseId === exerciseId ? { ...re, ...patch } : re
      ),
    })
  }, [routine, updateRoutine])

  if (!routine) return null

  /**
   * Series y reps: con "Semanas 4-6" elegido se editan las de ese bloque (se
   * crean a partir de las de base la primera vez); si no, las de base.
   */
  const updateSerie = (re: RoutineExercise, patch: Partial<Pick<RoutineExercise, 'sets' | 'repsMin' | 'repsMax' | 'targetSeconds'>>) => {
    if (routine.variante === 'alt') {
      const base = re.alt ?? { sets: re.sets, repsMin: re.repsMin, repsMax: re.repsMax, targetSeconds: re.targetSeconds }
      updateExerciseConfig(re.exerciseId, { alt: { ...base, ...patch } })
    } else {
      updateExerciseConfig(re.exerciseId, patch)
    }
  }
  const mostrarVariante = tieneVariante(routine) || editMode

  const lastWorkout = [...workouts]
    .filter((w) => w.routineId === routine.id && w.finishedAt)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0]

  const lastUsedDate = lastWorkout
    ? new Date(lastWorkout.startedAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })
    : null

  const totalDuration = rutinaEnUso(routine).exercises.reduce((acc, re) => acc + re.sets * 2.5, 0)

  const moveExercise = (idx: number, dir: 'up' | 'down') => {
    const sorted = [...routine.exercises].sort((a, b) => a.order - b.order)
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sorted.length) return
    const swapped = [...sorted]
    ;[swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]]
    // Reassign contiguous order values from the new positions, since prior
    // add/remove operations can leave the underlying `order` field with gaps.
    const reordered = swapped.map((ex, i) => ({ ...ex, order: i }))
    reorderRoutineExercises(routine.id, reordered)
  }

  if (showExercisePicker) {
    return <ExercisePickerScreen routineName={routine.name} />
  }

  const sortedExercises = [...routine.exercises].sort((a, b) => a.order - b.order)

  return (
    <div className="flex-1 min-h-0 flex flex-col screen-enter" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 safe-top pb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--surf) 0%, var(--bg) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(232,99,74,0.05) 0%, transparent 70%)' }}
        />
        <div className="flex items-center gap-3 mb-4 relative">
          <button
            onClick={() => setActiveRoutineId(null)}
            aria-label="Volver"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <BackIcon />
          </button>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <input
                className="w-full rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(232,99,74,0.3)',
                  fontSize: 18,
                }}
                value={routine.name}
                onChange={(e) => updateRoutine({ ...routine, name: e.target.value })}
              />
            ) : (
              <h1 className="text-xl font-bold text-white truncate">
                <RoutineBadge routineId={routine.id} size={18} />{routine.name}
              </h1>
            )}
          </div>
          {editMode && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Eliminar rutina"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'rgba(239,68,68,0.7)',
              }}
            >
              <TrashIcon />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          >
            {routine.exercises.length} ejercicios
          </span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          >
            ~{Math.round(totalDuration)} min
          </span>
          {lastUsedDate && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(232,99,74,0.06)', color: 'rgba(232,99,74,0.5)' }}
              >
                Último: {lastUsedDate}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="flex-shrink-0 px-4 py-3 flex gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => {
            if (routine.exercises.length === 0) {
              addToast('Agregá al menos un ejercicio antes de iniciar', 'info')
              return
            }
            startWorkout(routine.id)
          }}
          className="flex-1 btn-primary-glow py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <PlayIcon />
          <span>Iniciar</span>
        </button>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          style={editMode ? {
            background: 'rgba(232,99,74,0.12)',
            border: '1px solid rgba(232,99,74,0.3)',
            color: 'var(--primary)',
          } : {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          {editMode ? <CheckIcon /> : <EditIcon />}
          <span>{editMode ? 'Listo' : 'Editar'}</span>
        </button>
      </div>

      {/* Bloque del plan: cambia series y reps de toda la rutina */}
      {mostrarVariante && (
        <div className="flex-shrink-0 px-4 pt-3">
          <div style={{ display: 'flex', background: S.surf, borderRadius: 12, padding: 3, border: `1px solid ${S.line2}` }} role="radiogroup" aria-label="Bloque del plan">
            {(['base', 'alt'] as const).map((v) => {
              const activo = (routine.variante ?? 'base') === v
              return (
                <button key={v} role="radio" aria-checked={activo}
                  onClick={() => updateRoutine({ ...routine, variante: v })}
                  style={{ flex: 1, minHeight: 40, borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activo ? S.surf2 : 'transparent', color: activo ? S.ink : S.dim }}>
                  {VARIANTE_LABEL[v]}
                </button>
              )
            })}
          </div>
          {editMode && routine.variante === 'alt' && (
            <p style={{ fontSize: 11, color: S.dim, marginTop: 6 }}>Las series y reps que edites ahora son las de las semanas 4-6.</p>
          )}
        </div>
      )}

      {/* Exercise list */}
      <div className="flex-1 min-h-0 scroll-area px-4 py-4">
        <div className="flex flex-col gap-2.5">
          {sortedExercises.map((re, idx) => {
            const ex = exercises.find((e) => e.id === re.exerciseId)
            if (!ex) return null
            const config = muscleGroupConfig[ex.muscleGroup]
            const byTime = isDurationExercise(ex)
            const unit = durationUnit(ex)
            const uso = ejercicioEnUso(re, routine.variante)
            const prev = sortedExercises[idx - 1]
            const nuevoBloque = !!re.block && re.block !== prev?.block
            const ss = posicionEnSuperserie(sortedExercises, idx)
            const bloqueCount = re.block ? sortedExercises.filter((e) => e.block === re.block).length : 0

            return (
              <div key={re.exerciseId}>
              {nuevoBloque && (
                <div className="flex items-baseline justify-between" style={{ margin: idx === 0 ? '0 2px 8px' : '14px 2px 8px' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{re.block}</h3>
                  <span style={{ fontSize: 11, color: S.faint }}>{bloqueCount} {bloqueCount === 1 ? 'ejercicio' : 'ejercicios'}</span>
                </div>
              )}
              {ss.primero && (
                <p style={{ fontSize: 11, fontWeight: 700, color: S.acc, margin: '2px 0 6px 18px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Superserie</p>
              )}
              <div style={{ position: 'relative', paddingLeft: ss.dentro ? 18 : 0 }}>
              {/* La llave que une los ejercicios de la superserie */}
              {ss.dentro && (
                <span aria-hidden="true" style={{
                  position: 'absolute', left: 4, width: 8,
                  top: ss.primero ? '50%' : -10, bottom: ss.ultimo ? '50%' : -10,
                  borderLeft: `2px solid ${S.acc}`,
                  borderTop: ss.primero ? `2px solid ${S.acc}` : 'none',
                  borderBottom: ss.ultimo ? `2px solid ${S.acc}` : 'none',
                  borderRadius: ss.primero ? '6px 0 0 0' : ss.ultimo ? '0 0 0 6px' : 0,
                }} />
              )}
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: 'linear-gradient(160deg, var(--surf2) 0%, var(--surf) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 16px rgba(0,0,0,0.35)',
                }}
              >
                {editMode && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveExercise(idx, 'up')}
                      disabled={idx === 0}
                      aria-label="Mover arriba"
                      className="transition-colors leading-none text-sm w-8 h-7 flex items-center justify-center rounded"
                      style={{
                        color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveExercise(idx, 'down')}
                      disabled={idx === sortedExercises.length - 1}
                      aria-label="Mover abajo"
                      className="transition-colors leading-none text-sm w-8 h-7 flex items-center justify-center rounded"
                      style={{
                        color: idx === sortedExercises.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      ↓
                    </button>
                  </div>
                )}

                <ExerciseThumbnail exercise={ex} size={48} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate mb-0.5">{ex.nameEs}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: config.color, backgroundColor: config.color + '18' }}
                    >
                      {config.label}
                    </span>
                    {editMode && byTime ? (
                      <div className="flex items-center gap-1.5">
                        <DraftNumberInput
                          value={uso.sets}
                          min={1}
                          max={20}
                          ariaLabel="Series"
                          onCommit={(v) => updateSerie(re, { sets: v })}
                          className="w-9 text-center text-xs font-semibold rounded-lg py-1 border focus:outline-none focus:border-primary text-white bg-surface border-border"
                        />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>×</span>
                        <DraftNumberInput
                          value={Number(fromSeconds(uso.targetSeconds ?? 0, unit) || 0)}
                          min={0}
                          max={unit === 'min' ? 300 : 3600}
                          decimal={unit === 'min'}
                          ariaLabel={unit === 'min' ? 'Minutos' : 'Segundos'}
                          onCommit={(v) => updateSerie(re, { targetSeconds: toSeconds(v, unit) })}
                          className="w-12 text-center text-xs font-semibold rounded-lg py-1 border focus:outline-none focus:border-primary text-white bg-surface border-border"
                        />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{unit}</span>
                      </div>
                    ) : editMode ? (
                      <div className="flex items-center gap-1.5">
                        <DraftNumberInput
                          value={uso.sets}
                          min={1}
                          max={20}
                          ariaLabel="Series"
                          onCommit={(v) => updateSerie(re, { sets: v })}
                          className="w-9 text-center text-xs font-semibold rounded-lg py-1 border focus:outline-none focus:border-primary text-white bg-surface border-border"
                        />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>s ·</span>
                        <DraftNumberInput
                          value={uso.repsMin}
                          min={1}
                          max={100}
                          ariaLabel="Reps mínimas"
                          // Si el piso pasa al techo, el techo sube con él (8-12 → 15-15).
                          onCommit={(v) => updateSerie(re, { repsMin: v, ...(v > uso.repsMax ? { repsMax: v } : {}) })}
                          className="w-9 text-center text-xs font-semibold rounded-lg py-1 border focus:outline-none focus:border-primary text-white bg-surface border-border"
                        />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>–</span>
                        <DraftNumberInput
                          value={uso.repsMax}
                          min={1}
                          max={100}
                          ariaLabel="Reps máximas"
                          onCommit={(v) => updateSerie(re, { repsMax: v, ...(v < uso.repsMin ? { repsMin: v } : {}) })}
                          className="w-9 text-center text-xs font-semibold rounded-lg py-1 border focus:outline-none focus:border-primary text-white bg-surface border-border"
                        />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>r</span>
                      </div>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {byTime
                          ? `${uso.sets > 1 ? `${uso.sets} × ` : ''}${formatDuration(uso.targetSeconds ?? 0)}`
                          : `${uso.sets} series · ${uso.repsMin === uso.repsMax ? uso.repsMin : `${uso.repsMin}–${uso.repsMax}`} reps`}
                      </span>
                    )}
                  </div>
                  {re.note && (
                    <p className="text-[11px] mt-1 leading-snug" style={{ color: 'rgba(242,169,59,0.75)' }}>
                      {re.note}
                    </p>
                  )}
                </div>

                {editMode && (
                  <button
                    onClick={() => setOpcionesDe(re.exerciseId)}
                    aria-label={`Bloque y superserie de ${ex.nameEs}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 16 }}
                  >
                    ⋯
                  </button>
                )}
                {editMode ? (
                  <button
                    onClick={() => removeExerciseFromRoutine(routine.id, re.exerciseId)}
                    aria-label="Quitar ejercicio"
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: 'rgba(239,68,68,0.7)',
                      fontSize: '18px',
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <span
                    className="text-xs font-bold flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
              </div>
              </div>
            )
          })}
        </div>

        {/* Add exercise button */}
        <button
          onClick={() => setShowExercisePicker(true)}
          className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
          style={{
            border: '1.5px dashed rgba(232,99,74,0.2)',
            background: 'rgba(232,99,74,0.02)',
            color: 'rgba(232,99,74,0.5)',
          }}
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-sm font-semibold">Agregar ejercicio</span>
        </button>

        {/* Alta rápida: armar la rutina escribiendo sólo el nombre. */}
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const ex = createCustomExercise(quickName)
              if (!ex) return
              addExerciseToRoutine(routine.id, ex.id)
              addToast(`${ex.nameEs} agregado`, 'success')
              setQuickName('')
            }}
            placeholder="…o escribí el nombre y listo"
            className="w-full rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <CreateExerciseCard
            name={quickName}
            onCreated={(ex) => { addExerciseToRoutine(routine.id, ex.id); setQuickName('') }}
            label="Agregar"
          />
        </div>

        <div className="h-6" />
      </div>

      {/* Bloque y superserie de un ejercicio */}
      {opcionesDe && (() => {
        const idx = sortedExercises.findIndex((e) => e.exerciseId === opcionesDe)
        const re = sortedExercises[idx]
        const ex = exercises.find((e) => e.id === opcionesDe)
        if (!re) return null
        const siguiente = sortedExercises[idx + 1]
        const unidoAlSiguiente = !!re.supersetGroup && siguiente?.supersetGroup === re.supersetGroup
        const bloques = [...new Set(sortedExercises.map((e) => e.block).filter(Boolean))] as string[]
        const guardar = (exs: RoutineExercise[]) => updateRoutine({ ...routine, exercises: exs })
        return (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setOpcionesDe(null)}>
            <Dialog label="Opciones del ejercicio" onClose={() => setOpcionesDe(null)} className="w-full rounded-t-3xl px-4 pt-4 sheet-enter" onClick={(e) => e.stopPropagation()}
              style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: S.ink, marginBottom: 14 }}>{ex?.nameEs}</p>

              <label htmlFor="bloque-input" style={{ fontSize: 12, fontWeight: 600, color: S.dim }}>Bloque</label>
              <input
                id="bloque-input"
                list="bloques-rutina"
                value={re.block ?? ''}
                onChange={(e) => updateExerciseConfig(re.exerciseId, { block: e.target.value || undefined })}
                placeholder="Ej: Circuito de entrada · 3 rondas"
                className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none"
                style={{ marginTop: 6, background: S.surf2, border: `1px solid ${S.line2}`, color: S.ink }}
              />
              <datalist id="bloques-rutina">{bloques.map((b) => <option key={b} value={b} />)}</datalist>
              <p style={{ fontSize: 11, color: S.faint, marginTop: 6 }}>Se muestra como título arriba del primer ejercicio del bloque.</p>

              {siguiente && (
                <button
                  onClick={() => guardar(unidoAlSiguiente
                    ? separarDelSiguiente(sortedExercises, idx, `ss-${Date.now()}`)
                    : unirConSiguiente(sortedExercises, idx, `ss-${Date.now()}`))}
                  className="w-full text-left"
                  style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: S.surf2, border: `1px solid ${S.line2}`, color: S.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {unidoAlSiguiente ? '☑ En superserie con el siguiente' : '☐ Superserie con el siguiente'}
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: S.dim, marginTop: 2 }}>
                    {exercises.find((e) => e.id === siguiente.exerciseId)?.nameEs}
                  </span>
                </button>
              )}

              <button onClick={() => setOpcionesDe(null)}
                style={{ width: '100%', marginTop: 10, padding: '14px 16px', borderRadius: 14, background: 'none', border: `1px solid ${S.line2}`, color: S.dim, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Listo
              </button>
            </Dialog>
          </div>
        )
      })()}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: 'linear-gradient(160deg, var(--surf2) 0%, var(--surf) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            }}
          >
            <h3 className="text-white font-bold text-lg mb-2">¿Eliminar rutina?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Se eliminará "{routine.name}" y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteRoutine(routine.id)
                  setActiveRoutineId(null)
                }}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: 'rgb(248,113,113)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
