import { useState } from 'react'
import { useHoy } from '../utils/useHoy'
import { useStore } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { CustomExercisesScreen } from './CustomExercisesScreen'
import type { MuscleGroup, Routine } from '../types'
import { useLongPress } from '../utils/useLongPress'
import { MuscleIcon } from '../components/MuscleIcon'
import { RoutineBadge, RoutineIcon } from '../components/RoutineIcon'
import { routineColor } from '../utils/trainingDays'
import { haceCuanto } from '../utils/relativeDate'
import { rutinaEnUso, tieneVariante, VARIANTE_LABEL } from '../utils/routineVariant'
import { S } from '../theme'

/**
 * Detecta el "mantener apretado" sobre una tarjeta. Se usa pointer events para
 * que funcione igual con dedo y con mouse, y se cancela si el dedo se mueve
 * (si no, arrastrar para scrollear abriría el menú).
 */
function RoutineCard({ routine, children, onOpen, onLongPress }: {
  routine: Routine
  children: React.ReactNode
  onOpen: () => void
  onLongPress: () => void
}) {
  const { consumioElTap, handlers } = useLongPress(onLongPress)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!consumioElTap()) onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      aria-label={`${routine.name}. Mantené apretado para más opciones`}
      {...handlers}
      style={{
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </div>
  )
}

/** Grupos de la rutina ordenados por cantidad de series, de más a menos. */
function getRoutineMuscleGroups(routine: Routine, exercises: { id: string; muscleGroup: MuscleGroup }[]) {
  const series = new Map<MuscleGroup, number>()
  for (const re of rutinaEnUso(routine).exercises) {
    const ex = exercises.find((e) => e.id === re.exerciseId)
    if (ex) series.set(ex.muscleGroup, (series.get(ex.muscleGroup) ?? 0) + re.sets)
  }
  return [...series.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
}

/** Chips a la vista: los tres grupos con más series; el resto se cuenta en "+N". */
const CHIPS_VISIBLES = 3

function getApproxDuration(sets: number[]) {
  return Math.round(sets.reduce((a, s) => a + s * 2.5, 0))
}

export function RutinasScreen() {
  const { routines, exercises, workouts, customExercises, setActiveRoutineId, addRoutine, deleteRoutine, addToast } = useStore()
  const [showCustomExercises, setShowCustomExercises] = useState(false)
  const [menuRoutine, setMenuRoutine] = useState<Routine | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Routine | null>(null)

  const allExercises = [...exercises, ...customExercises]
  const sortedWorkouts = [...workouts]
    .filter((w) => w.finishedAt)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
  // Cuándo se hizo cada rutina por última vez, para "hace 2 días".
  const ultimaVez = new Map<string, number>()
  for (const w of sortedWorkouts) if (!ultimaVez.has(w.routineId)) ultimaVez.set(w.routineId, w.startedAt)
  const nowTs = useHoy()

  const handleCreateRoutine = () => {
    const id = `routine-${Date.now()}`
    addRoutine({
      id,
      name: 'Nueva Rutina',
      emoji: '💪',
      exercises: [],
      createdAt: Date.now(),
    })
    setActiveRoutineId(id)
  }

  if (showCustomExercises) {
    return <CustomExercisesScreen onClose={() => setShowCustomExercises(false)} />
  }

  return (
    <div className="flex-1 min-h-0 scroll-area" style={{ paddingBottom: 16 }}>

      {/* Header */}
      <div style={{ paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 22px))', paddingLeft: 22, paddingRight: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: S.ink }}>Mis Rutinas</div>
        <div style={{ fontSize: 13, color: S.dim, marginTop: 4 }}>
          {routines.length} rutinas guardadas · mantené apretada una para más opciones
        </div>
      </div>

      {/* Routine cards */}
      <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {routines.map((routine) => {
          const muscleGroups = getRoutineMuscleGroups(routine, allExercises)
          const ocultos = muscleGroups.length - CHIPS_VISIBLES
          const totalSets = rutinaEnUso(routine).exercises.map((e) => e.sets)
          const duration = getApproxDuration(totalSets)
          const color = routineColor(routine.id, routines)

          return (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onOpen={() => setActiveRoutineId(routine.id)}
              onLongPress={() => setMenuRoutine(routine)}
            >
              <div style={{
                background: S.surf, borderRadius: 16, padding: 16, textAlign: 'left', width: '100%',
                border: '1px solid rgba(236,238,244,0.12)',
                borderLeft: `3px solid ${color}`,
                transition: 'all 0.15s',
              }}>
              <div className="flex items-start gap-3">
                <RoutineIcon routine={routine} size={19} boxed />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 17, fontWeight: 700, color: S.ink }}>{routine.name}</div>
                  <div style={{ fontSize: 12, color: S.dim, marginTop: 3 }}>
                    {routine.exercises.length} ejercicios · ~{duration} min
                    {ultimaVez.has(routine.id) && <> · {haceCuanto(ultimaVez.get(routine.id)!, nowTs)}</>}
                    {routine.variante === 'alt' && tieneVariante(routine) && <> · {VARIANTE_LABEL.alt}</>}
                  </div>
                </div>
                <div style={{ color: S.mute, fontSize: 22, alignSelf: 'center', lineHeight: 1 }}>›</div>
              </div>

              {muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-[6px]" style={{ marginTop: 12 }}>
                  {muscleGroups.slice(0, CHIPS_VISIBLES).map(mg => {
                    const cfg = muscleGroupConfig[mg]
                    return (
                      <span key={mg} style={{
                        fontSize: 11, fontWeight: 600, color: cfg.color,
                        background: cfg.color + '22', padding: '4px 10px', borderRadius: 24,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <MuscleIcon group={mg} size={20} /> {cfg.label}
                      </span>
                    )
                  })}
                  {ocultos > 0 && (
                    <span
                      title={muscleGroups.slice(CHIPS_VISIBLES).map((g) => muscleGroupConfig[g].label).join(', ')}
                      aria-label={`y ${ocultos} más: ${muscleGroups.slice(CHIPS_VISIBLES).map((g) => muscleGroupConfig[g].label).join(', ')}`}
                      style={{ fontSize: 11, fontWeight: 600, color: S.dim, background: S.surf2, padding: '4px 10px', borderRadius: 24, display: 'inline-flex', alignItems: 'center' }}
                    >
                      +{ocultos}
                    </span>
                  )}
                </div>
              )}
              </div>
            </RoutineCard>
          )
        })}
      </div>

      {/* Create button */}
      <div style={{ padding: '14px 22px 0' }}>
        <button
          onClick={handleCreateRoutine}
          style={{
            width: '100%', border: '1px solid rgba(232,99,74,0.25)', borderRadius: 16,
            background: 'rgba(232,99,74,0.07)', color: S.acc,
            fontSize: 15, fontWeight: 700, padding: '16px 0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1, fontWeight: 700 }}>+</span> Crear nueva rutina
        </button>
      </div>

      {/* Custom exercises */}
      <div style={{ padding: '10px 22px 0' }}>
        <button
          onClick={() => setShowCustomExercises(true)}
          style={{
            width: '100%', borderRadius: 16, padding: '14px 0',
            border: '1px solid rgba(236,238,244,0.12)',
            background: S.surf,
            color: S.dim,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>💪</span> Mis ejercicios
          {customExercises.some(e => !e.archived) && (
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 24, fontWeight: 700,
              background: 'rgba(236,238,244,0.08)', color: S.ink,
            }}>
              {customExercises.filter(e => !e.archived).length}
            </span>
          )}
        </button>
      </div>

      {/* Menú de la rutina (mantener apretado) */}
      {menuRoutine && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setMenuRoutine(null)}>
          <div
            className="w-full rounded-t-3xl px-4 pt-4 pb-8 sheet-enter"
            style={{ background: S.surf, borderTop: '1px solid rgba(236,238,244,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: S.ink, marginBottom: 2 }}>
              <RoutineBadge routineId={menuRoutine.id} size={16} />{menuRoutine.name}
            </p>
            <p style={{ fontSize: 12, color: S.dim, marginBottom: 16 }}>
              {menuRoutine.exercises.length} ejercicios
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { const r = menuRoutine; setMenuRoutine(null); setActiveRoutineId(r.id) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                  background: S.surf2, border: '1px solid rgba(236,238,244,0.12)',
                  color: S.ink, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✏️  Editar rutina
              </button>
              <button
                onClick={() => { const r = menuRoutine; setMenuRoutine(null); setConfirmDelete(r) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)',
                  color: S.bad, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🗑  Eliminar rutina
              </button>
              <button
                onClick={() => setMenuRoutine(null)}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12, marginTop: 4,
                  background: 'none', border: '1px solid rgba(236,238,244,0.12)',
                  color: S.dim, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div style={{ background: S.surf, border: '1px solid rgba(236,238,244,0.12)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340 }}>
            <h3 style={{ color: S.ink, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>¿Eliminar la rutina?</h3>
            <p style={{ color: S.dim, fontSize: 13, marginBottom: 20 }}>
              Se borra <strong style={{ color: S.ink }}>{confirmDelete.name}</strong>. Los entrenos que ya hiciste
              con ella quedan en el historial.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(236,238,244,0.12)', color: S.dim, fontSize: 15, fontWeight: 600, background: 'none', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteRoutine(confirmDelete.id)
                  addToast(`Se eliminó ${confirmDelete.name}`, 'info')
                  setConfirmDelete(null)
                }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', background: 'rgba(248,113,113,0.15)', color: S.bad }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
