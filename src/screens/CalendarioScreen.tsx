import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { useHoy } from '../utils/useHoy'
import { useStore, useAllExercises } from '../store/useStore'
import { useWorkoutStore } from '../stores/workoutStore'
import { isDurationExercise, durationUnit, formatDuration, totalSeconds, fromSeconds, toSeconds } from '../utils/duration'
import { fromDateInputValue, toDateInputValue } from '../utils/dates'
import { formatKg, formatLoad } from '../utils/format'
import { decimalInputProps, integerInputProps, parseDecimal } from '../utils/numberInput'
import { getWorkoutStreak } from '../utils/streak'
import { prediccionDelPlan } from '../utils/planOrder'
import { lunesDe } from '../utils/program'
import { claveDeSemana, planDeSemana } from '../utils/weekPlan'
import { recordsPorReps, REPS_TABLA } from '../utils/records'
import { muscleGroupConfig } from '../data/muscleGroups'
import { MuscleIcon } from '../components/MuscleIcon'
import { RoutineBadge, RoutineIcon } from '../components/RoutineIcon'
import { MonthCalendar } from '../components/MonthCalendar'
import { useLongPress } from '../utils/useLongPress'
import { inicioDeFaltas, monthStats, plannedDowSet, routineColor } from '../utils/trainingDays'
import type { CalendarSubTab, MuscleGroup, Routine, Workout } from '../types'
import { S } from '../theme'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type SelectedDay = { day: number; month: number; year: number }


function DaySheet({
  selectedDay, allWorkouts, routines, onClose, onStartWorkout,
}: {
  selectedDay: SelectedDay; allWorkouts: Workout[]; routines: Routine[]
  onClose: () => void; onStartWorkout: (routineId: string, dateOverride?: number) => void
}) {
  const { deleteWorkout, restoreWorkout, addUndoToast, getArchivedRoutineName } = useStore()
  const exercises = useAllExercises()
  const [showRoutinePicker, setShowRoutinePicker] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const { day, month, year } = selectedDay
  const dayWorkouts = allWorkouts.filter((w) => {
    if (!w.finishedAt) return false
    const d = new Date(w.startedAt)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })
  const date = new Date(year, month, day)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const isToday = date.toDateString() === new Date().toDateString()
  const isFuture = date.getTime() > todayMidnight.getTime()
  const dateLabel = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  /**
   * Borrar deja un aviso con "Deshacer" en vez de pedir confirmación antes.
   * Es más rápido para el caso normal y sigue habiendo red si te equivocaste.
   */
  const borrarConDeshacer = (w: Workout) => {
    const nombre = (routines.find((r) => r.id === w.routineId) ?? getArchivedRoutineName(w.routineId))?.name ?? 'el entreno'
    deleteWorkout(w.id)
    addUndoToast(`Se borró ${nombre} del ${new Date(w.startedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`, () => restoreWorkout(w))
  }

  const handleStart = (routineId: string) => {
    const dateOverride = isToday ? undefined : new Date(year, month, day, 12, 0, 0).getTime()
    onStartWorkout(routineId, dateOverride)
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={onClose}>
      <Dialog label="Día del calendario" onClose={onClose}
        className="w-full rounded-t-3xl px-4 pt-4 pb-8 max-h-[80vh] flex flex-col sheet-enter"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 16px' }} />
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 17, textTransform: 'capitalize' }}>{dateLabel}</h3>
            {isToday && <p style={{ color: S.acc, fontSize: 12, fontWeight: 600 }}>Hoy</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ color: S.dim, fontSize: 22, lineHeight: 1, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        {showRoutinePicker ? (
          <>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <button onClick={() => setShowRoutinePicker(false)} style={{ color: S.dim, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>‹ Volver</button>
              <p style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>Elegí una rutina</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
              {routines.filter(r => r.exercises.length > 0).length === 0 ? (
                <p style={{ color: S.dim, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No tenés rutinas con ejercicios aún</p>
              ) : routines.filter(r => r.exercises.length > 0).map((r) => (
                <button key={r.id} onClick={() => handleStart(r.id)}
                  style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', cursor: 'pointer' }}>
                  <RoutineIcon routine={r} size={16} boxed />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, color: S.ink, fontSize: 13 }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: S.dim }}>{r.exercises.length} ejercicios</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {dayWorkouts.length === 0 ? (
                <p style={{ color: S.dim, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Sin actividad registrada</p>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {dayWorkouts.map((w) => {
                    const routine = routines.find((r) => r.id === w.routineId) ?? getArchivedRoutineName(w.routineId)
                    const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0)
                    return (
                      <div key={w.id} style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12, padding: 12 }}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p style={{ fontWeight: 600, color: S.ink, fontSize: 13 }}><RoutineBadge routineId={w.routineId} />{routine?.name ?? 'Rutina eliminada'}</p>
                            <p style={{ fontSize: 11, color: S.dim }}>{w.exercises.length} ejercicios · {totalSets} series · {w.durationMin ?? 0}min</p>
                          </div>
                          <button
                            onClick={() => setEditingWorkout(w)}
                            aria-label="Editar este entreno"
                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}
                          >✏️</button>
                          <button
                            onClick={() => borrarConDeshacer(w)}
                            aria-label="Borrar este entreno"
                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}
                          >🗑</button>
                        </div>
                        <div className="flex flex-col gap-1">
                          {w.exercises.slice(0, 4).map((we) => {
                            const ex = exercises.find((e) => e.id === we.exerciseId)
                            if (!ex) return null
                            const best = we.sets.length > 0 ? we.sets.reduce((a, s) => (s.kg > a.kg ? s : a), we.sets[0]) : null
                            const byTime = isDurationExercise(ex)
                            return (
                              <div key={we.exerciseId} className="flex items-center justify-between">
                                <p style={{ color: S.dim, fontSize: 11 }}>{ex.nameEs}</p>
                                {byTime
                                  ? <p style={{ color: S.faint, fontSize: 11 }}>{formatDuration(totalSeconds(we.sets))}</p>
                                  : best && <p style={{ color: S.faint, fontSize: 11 }}>{formatLoad(best.kg, best.reps, { conReps: false })}</p>}
                              </div>
                            )
                          })}
                          {w.exercises.length > 4 && <p style={{ color: S.faint, fontSize: 11 }}>+{w.exercises.length - 4} más...</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {isFuture ? (
              <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: S.faint, flexShrink: 0 }}>
                No podés registrar entrenos en fechas futuras
              </p>
            ) : (
              <button onClick={() => setShowRoutinePicker(true)} style={{
                marginTop: 16, width: '100%', padding: '14px 0', borderRadius: 14,
                background: S.acc, border: 'none', color: '#fff',
                fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0,
              }}>
                + Registrar entreno
              </button>
            )}
          </>
        )}
      </Dialog>
      {editingWorkout && (
        <EditWorkoutSheet workout={editingWorkout} onClose={() => setEditingWorkout(null)} />
      )}
    </div>
  )
}

function EditWorkoutSheet({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const { updateWorkout } = useStore()
  const exercises = useAllExercises()

  const [dateStr, setDateStr] = useState(toDateInputValue(workout.startedAt))
  const [durationStr, setDurationStr] = useState(String(workout.durationMin ?? 0))
  const [inicial] = useState(() =>
    workout.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      sets: we.sets.map((s) => ({
        kg: String(s.kg),
        reps: String(s.reps),
        isWarmup: s.isWarmup,
        duration: s.durationSec ? fromSeconds(s.durationSec, durationUnit(exercises.find(e => e.id === we.exerciseId))) : '',
        completedAt: s.completedAt as number | undefined,
      })),
    }))
  )
  const [draftExercises, setDraftExercises] = useState(inicial)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const hayCambios = dateStr !== toDateInputValue(workout.startedAt)
    || durationStr !== String(workout.durationMin ?? 0)
    || JSON.stringify(draftExercises) !== JSON.stringify(inicial)
  const hoyStr = toDateInputValue(useHoy())
  const fechaValida = fromDateInputValue(dateStr) !== null && dateStr <= hoyStr
  // Tocar afuera descartaba todo sin preguntar.
  const cerrar = () => { if (hayCambios) setConfirmarDescarte(true); else onClose() }

  const setValue = (exIdx: number, setIdx: number, field: 'kg' | 'reps' | 'duration', value: string) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
      })
    )
  }

  const addSet = (exIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex
        const last = ex.sets[ex.sets.length - 1]
        return {
          ...ex,
          sets: [...ex.sets, {
            kg: last?.kg ?? '0',
            reps: last?.reps ?? '0',
            isWarmup: undefined as boolean | undefined,
            duration: last?.duration ?? '',
            completedAt: undefined as number | undefined,
          }],
        }
      })
    )
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) => ei !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) })
    )
  }

  const handleSave = () => {
    // Si el selector de fecha quedó vacío ("Borrar" en iOS y Android) daba NaN,
    // y el entreno desaparecía de todas las vistas sin poder editarse más.
    const dia = fromDateInputValue(dateStr)
    if (dia === null || !fechaValida) return
    const fecha = new Date(dia)
    const original = new Date(workout.startedAt)
    const newStartedAt = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), original.getHours(), original.getMinutes(), original.getSeconds()).getTime()
    if (!Number.isFinite(newStartedAt)) return
    const corrimiento = newStartedAt - workout.startedAt
    const durationMin = Math.max(0, Math.round(parseDecimal(durationStr)) || 0)
    const finishedAt = newStartedAt + durationMin * 60000
    const newExercises = draftExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets
        .filter((s) => s.kg !== '' || s.reps !== '' || s.duration !== '')
        .map((s) => ({
          kg: parseDecimal(s.kg) || 0,
          reps: parseInt(s.reps.replace(/[^0-9]/g, '')) || 0,
          // La hora real de cada serie se conserva (corrida si cambió el día).
          completedAt: s.completedAt ? Math.min(finishedAt, s.completedAt + corrimiento) : finishedAt,
          isWarmup: s.isWarmup,
          durationSec: s.duration
            ? toSeconds(s.duration, durationUnit(exercises.find(e => e.id === ex.exerciseId)))
            : undefined,
        })),
    })).filter((ex) => ex.sets.length > 0)

    updateWorkout({
      ...workout,
      startedAt: newStartedAt,
      finishedAt,
      durationMin,
      exercises: newExercises,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={(e) => { e.stopPropagation(); cerrar() }}>
      <Dialog label="Editar entreno" onClose={cerrar}
        className="w-full rounded-t-3xl px-4 pt-4 pb-8 max-h-[85vh] flex flex-col sheet-enter"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 16px' }} />
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 17 }}><RoutineBadge routineId={workout.routineId} size={16} />Editar entreno</h3>
          <button onClick={cerrar} aria-label="Cerrar" style={{ color: S.dim, fontSize: 22, lineHeight: 1, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        {confirmarDescarte && (
          <div role="alert" className="flex items-center gap-2 mb-3 flex-shrink-0" style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12, padding: '8px 10px' }}>
            <span style={{ flex: 1, fontSize: 13, color: S.ink }}>Tenés cambios sin guardar</span>
            <button onClick={() => setConfirmarDescarte(false)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 10, border: `1px solid ${S.line2}`, background: 'none', color: S.ink, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Seguir editando</button>
            <button onClick={onClose} style={{ minHeight: 36, padding: '0 10px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Descartar</button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ fontSize: 11, color: S.dim, fontWeight: 600 }}>Fecha</label>
              <input type="date" value={dateStr} max={hoyStr} onChange={(e) => setDateStr(e.target.value)}
                aria-invalid={!fechaValida}
                style={{ width: '100%', marginTop: 4, background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 16, color: S.ink, fontFamily: 'inherit' }} />
            </div>
            <div style={{ width: 120 }}>
              <label style={{ fontSize: 11, color: S.dim, fontWeight: 600 }}>Duración (min)</label>
              <input {...integerInputProps} value={durationStr} onChange={(e) => setDurationStr(e.target.value)}
                style={{ width: '100%', marginTop: 4, background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 16, color: S.ink, fontFamily: 'inherit' }} />
            </div>
          </div>

          {draftExercises.map((ex, exIdx) => {
            const exInfo = exercises.find((e) => e.id === ex.exerciseId)
            const byTime = isDurationExercise(exInfo)
            const unit = durationUnit(exInfo)
            return (
              <div key={ex.exerciseId} style={{ background: S.surf2, borderRadius: 14, padding: 12, border: `1px solid ${S.line2}` }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: S.ink, marginBottom: 8 }}>{exInfo?.nameEs ?? ex.exerciseId}</p>
                <div className="flex flex-col gap-2">
                  {ex.sets.map((s, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2">
                      <span style={{ width: 18, fontSize: 11, color: S.faint }}>{setIdx + 1}</span>
                      {byTime ? (
                        <>
                          <input {...decimalInputProps} value={s.duration} onChange={(e) => setValue(exIdx, setIdx, 'duration', e.target.value)}
                            placeholder={unit}
                            style={{ flex: 1, minWidth: 0, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 8, padding: '6px 10px', fontSize: 16, color: S.ink, fontFamily: 'inherit' }} />
                          <span style={{ color: S.faint, fontSize: 11 }}>{unit}</span>
                        </>
                      ) : (
                        <>
                          <input {...decimalInputProps} value={s.kg} onChange={(e) => setValue(exIdx, setIdx, 'kg', e.target.value)}
                            placeholder="kg"
                            style={{ flex: 1, minWidth: 0, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 8, padding: '6px 10px', fontSize: 16, color: S.ink, fontFamily: 'inherit' }} />
                          <span style={{ color: S.faint, fontSize: 11 }}>×</span>
                          <input {...integerInputProps} value={s.reps} onChange={(e) => setValue(exIdx, setIdx, 'reps', e.target.value)}
                            placeholder="reps"
                            style={{ flex: 1, minWidth: 0, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 8, padding: '6px 10px', fontSize: 16, color: S.ink, fontFamily: 'inherit' }} />
                        </>
                      )}
                      <button onClick={() => removeSet(exIdx, setIdx)}
                        aria-label={`Borrar la serie ${setIdx + 1}`}
                        style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addSet(exIdx)}
                  style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: S.acc, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Agregar serie
                </button>
              </div>
            )
          })}
        </div>

        {!fechaValida && (
          <p role="alert" style={{ marginTop: 12, fontSize: 12, color: '#f87171', flexShrink: 0 }}>
            Elegí una fecha de hoy o anterior para poder guardar.
          </p>
        )}
        <button onClick={handleSave} disabled={!fechaValida} style={{
          marginTop: 16, width: '100%', padding: '14px 0', borderRadius: 14,
          background: S.acc, border: 'none', color: '#fff', opacity: fechaValida ? 1 : 0.4,
          fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 700, fontSize: 14, cursor: fechaValida ? 'pointer' : 'default', flexShrink: 0,
        }}>
          Guardar cambios
        </button>
      </Dialog>
    </div>
  )
}

const LONG_PRESS_MS = 550

function WeekPlanDayRow({
  label, routineId, routines, onSet,
}: {
  label: string; routineId: string | null; routines: Routine[]; onSet: (routineId: string | null) => void
}) {
  const routine = routineId ? routines.find(r => r.id === routineId) : null
  const [locked, setLocked] = useState(false)
  const timerRef = useRef<number | null>(null)

  const cancelPress = () => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
  }
  const startPress = () => {
    if (!routine) return // ya está en descanso: no hay nada que mantener presionado
    cancelPress()
    timerRef.current = window.setTimeout(() => {
      onSet(null)
      navigator.vibrate?.(15)
      // Deshabilitar el select un instante evita que, al soltar el dedo, el
      // click del gesto abra igual el desplegable nativo.
      setLocked(true)
      window.setTimeout(() => setLocked(false), 300)
    }, LONG_PRESS_MS)
  }

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 11, fontWeight: 600, width: 28, flexShrink: 0, color: S.dim }}>{label}</span>
      <select
        value={routine ? routineId! : ''}
        disabled={locked}
        onChange={(e) => onSet(e.target.value || null)}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 rounded-lg px-2 text-xs focus:outline-none appearance-none"
        style={{
          minHeight: 36, background: 'transparent', fontFamily: 'DM Sans, system-ui, sans-serif',
          // Aro con el color de la rutina, como en el calendario de arriba; el descanso, tenue.
          border: routine ? `1.5px solid ${routineColor(routine.id, routines)}` : '1.5px solid transparent',
          color: routine ? S.ink : S.faint, fontWeight: routine ? 700 : 500,
        }}>
        <option value="" style={{ background: S.surf, color: S.dim }}>Descanso</option>
        {routines.map((r) => <option key={r.id} value={r.id} style={{ background: S.surf, color: S.ink }}>{r.name}</option>)}
      </select>
    </div>
  )
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "5–11 oct" o "28 sep–4 oct" para la semana que arranca en `lunes`. */
function rangoSemana(lunes: Date): string {
  const dom = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)
  const ini = lunes.getMonth() === dom.getMonth() ? `${lunes.getDate()}` : `${lunes.getDate()} ${MESES_CORTOS[lunes.getMonth()]}`
  return `${ini}–${dom.getDate()} ${MESES_CORTOS[dom.getMonth()]}`
}

const botonModo = (activo: boolean): React.CSSProperties => ({
  flex: 1, minHeight: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'DM Sans, system-ui, sans-serif',
  background: activo ? S.surf2 : 'transparent', border: `1px solid ${activo ? S.line2 : 'transparent'}`,
  color: activo ? S.ink : S.dim,
})

const botonFlecha: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, background: S.surf2, border: `1px solid ${S.line2}`,
  color: S.ink, fontSize: 16, cursor: 'pointer',
}

/**
 * La semana por defecto (la que rige siempre) y, aparte, el plan de cada semana
 * puntual: no todas son iguales, y una semana sin plan propio sigue la de por defecto.
 */
function WeekPlanner() {
  const { weekPlan, weekOverrides, setWeekPlanDay, setWeekOverrideDay, clearWeekOverride, routines } = useStore()
  const [modo, setModo] = useState<'default' | 'semana'>('default')
  const [offset, setOffset] = useState(0) // 0 = esta semana
  const nowTs = useHoy()

  const lunes = new Date(lunesDe(nowTs))
  lunes.setDate(lunes.getDate() + offset * 7)
  const clave = claveDeSemana(lunes.getTime())
  const propio = weekOverrides[clave]
  const plan = modo === 'default' ? weekPlan : propio ?? weekPlan
  const titulo = offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana pasada' : 'Semana'

  return (
    <div style={{ background: S.surf, borderRadius: 14, padding: '14px 16px', border: `1px solid ${S.line2}` }}>
      <div className="flex gap-1" style={{ marginBottom: 12, padding: 3, borderRadius: 12, background: S.bg, border: `1px solid ${S.line}` }}>
        <button onClick={() => setModo('default')} style={botonModo(modo === 'default')}>Por defecto</button>
        <button onClick={() => setModo('semana')} style={botonModo(modo === 'semana')}>Por semana</button>
      </div>

      {modo === 'default' ? (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: S.dim, marginBottom: 2 }}>Semana por defecto</p>
          <p style={{ fontSize: 11, color: S.dim, marginBottom: 10 }}>
            Rige en todas las semanas que no tengan su propio plan. Los días que entrenás y el orden de las rutinas: si faltás un día, te toca la que sigue. Mantené apretado un día para marcarlo descanso.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
            <button onClick={() => setOffset((o) => Math.max(-4, o - 1))} aria-label="Semana anterior" style={botonFlecha}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{titulo}</p>
              <p className="num" style={{ fontSize: 11, color: S.dim }}>{rangoSemana(lunes)}</p>
            </div>
            <button onClick={() => setOffset((o) => o + 1)} aria-label="Semana siguiente" style={botonFlecha}>›</button>
          </div>
          <p style={{ fontSize: 11, color: S.dim, marginBottom: 10 }}>
            {propio
              ? 'Esta semana tiene su propio plan. Lo que cambies acá no toca la semana por defecto.'
              : 'Sigue la semana por defecto. Si cambiás un día, esta semana pasa a tener su propio plan.'}
          </p>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        {DOW_LABELS.map((label, dow) => (
          <WeekPlanDayRow
            key={dow}
            label={label}
            routineId={plan[dow] ?? null}
            routines={routines}
            onSet={(routineId) => modo === 'default' ? setWeekPlanDay(dow, routineId) : setWeekOverrideDay(clave, dow, routineId)}
          />
        ))}
      </div>

      {modo === 'semana' && propio && (
        <button
          onClick={() => clearWeekOverride(clave)}
          style={{ marginTop: 10, width: '100%', minHeight: 40, borderRadius: 10, background: 'none', border: `1px solid ${S.line2}`, color: S.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif' }}
        >
          Volver a la semana por defecto
        </button>
      )}
    </div>
  )
}

const opcionMenu: React.CSSProperties = {
  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14,
  background: S.surf2, border: `1px solid ${S.line2}`,
  color: S.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'DM Sans, system-ui, sans-serif',
}

/** Una fila del historial: tocar abre el día, mantener apretado abre el menú. */
function HistoryRow({ workout: w, routines, onOpen, onLongPress }: {
  workout: Workout; routines: Routine[]; onOpen: () => void; onLongPress: () => void
}) {
  const { getArchivedRoutineName } = useStore()
  const { consumioElTap, handlers } = useLongPress(onLongPress)
  const routine = routines.find((r) => r.id === w.routineId) ?? getArchivedRoutineName(w.routineId)
  const date = new Date(w.startedAt)
  const totalSets = w.exercises.reduce((acc, e) => acc + e.sets.length, 0)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${routine?.name ?? 'Entreno'} del ${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. Mantené apretado para editar o borrar`}
      onClick={() => { if (!consumioElTap()) onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      {...handlers}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, background: S.surf, borderRadius: 14, padding: 12,
        border: `1px solid ${S.line2}`, cursor: 'pointer', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      }}
    >
      <div style={{ borderRadius: 10, padding: '6px 0', textAlign: 'center', flexShrink: 0, width: 44, background: S.surf2 }}>
        <div className="num" style={{ fontSize: 15, fontWeight: 700, color: S.ink, lineHeight: 1 }}>{date.getDate()}</div>
        <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>{MONTH_NAMES[date.getMonth()].slice(0, 3)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontWeight: 700, color: S.ink, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><RoutineBadge routineId={w.routineId} />{routine?.name ?? 'Rutina eliminada'}</p>
        <p style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
          <span className="num">{w.exercises.length}</span> ej · <span className="num">{totalSets}</span> series · <span className="num">{w.durationMin ?? 0}</span> min
        </p>
      </div>
      <span style={{ color: S.faint, fontSize: 18, flexShrink: 0 }} aria-hidden="true">›</span>
    </div>
  )
}

function CalendarioTab({ year, month }: { year: number; month: number }) {
  const { workouts, routines, weekPlan, weekOverrides, deleteWorkout, restoreWorkout, addUndoToast, getArchivedRoutineName, inicioUso } = useStore()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const agendaDayTs = useStore((s) => s.agendaDayTs)
  const clearAgendaDay = useStore((s) => s.clearAgendaDay)
  // Si se llegó desde "Última sesión" en Inicio, se abre ese día directamente.
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(() => {
    if (agendaDayTs == null) return null
    const d = new Date(agendaDayTs)
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() }
  })
  useEffect(() => { if (agendaDayTs != null) clearAgendaDay() }, [agendaDayTs, clearAgendaDay])
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [menuWorkout, setMenuWorkout] = useState<Workout | null>(null)

  const borrarConDeshacer = (w: Workout) => {
    const nombre = (routines.find((r) => r.id === w.routineId) ?? getArchivedRoutineName(w.routineId))?.name ?? 'el entreno'
    deleteWorkout(w.id)
    addUndoToast(`Se borró ${nombre} del ${new Date(w.startedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`, () => restoreWorkout(w))
  }

  // Una sola lectura del reloj por montaje: el render tiene que ser puro.
  const nowTs = useHoy()
  const finishedWorkouts = workouts.filter(w => w.finishedAt)
  const routineIdsVivos = routines.map(r => r.id)
  // Los días anteriores a empezar a usar la app no son faltas.
  const desde = inicioDeFaltas(inicioUso, finishedWorkouts)
  const plannedDows = (d: Date) => (desde == null || d.getTime() >= desde) && plannedDowSet(planDeSemana(weekPlan, weekOverrides, d.getTime()), routineIdsVivos).has((d.getDay() + 6) % 7)
  // Se mide contra los días que la semana tipo pedía entrenar, no contra los 31
  // del mes: ir tres veces por semana es cumplir el plan.
  const { trained: gymDaysCount, planned } = monthStats(finishedWorkouts, year, month, nowTs, plannedDows)
  const streak = getWorkoutStreak(finishedWorkouts, nowTs)
  const recentWorkouts = [...finishedWorkouts].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8)
  // Plan en orden: los días que vienen muestran la rutina que de verdad te toca.
  const planPorDia = prediccionDelPlan(weekPlan, routines.map(r => r.id), finishedWorkouts, nowTs, 70, weekOverrides)

  return (
    <div className="flex flex-col gap-3">
      {/* Calendario del mes, con el resumen en una línea arriba */}
      <div style={{ background: S.surf, borderRadius: 18, padding: '14px 14px', border: `1px solid ${S.line2}` }}>
        <p style={{ fontSize: 13, color: S.dim, marginBottom: 12 }}>
          <span className="num" style={{ color: S.ink, fontWeight: 700 }}>{gymDaysCount}</span>
          {planned > 0 ? <> de <span className="num">{planned}</span> planificados</> : ` ${gymDaysCount === 1 ? 'día' : 'días'} de gym`}
          {' · '}racha <span className="num" style={{ color: S.ink, fontWeight: 700 }}>{streak.current}</span>
        </p>
        <MonthCalendar
          year={year}
          month={month}
          workouts={finishedWorkouts}
          routines={routines}
          weekPlan={weekPlan}
          weekOverrides={weekOverrides}
          planPorDia={planPorDia}
          desde={desde}
          onSelectDay={(ts) => {
            const d = new Date(ts)
            setSelectedDay({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear() })
          }}
        />
      </div>

      {/* Week planner */}
      <WeekPlanner />

      {/* Recent history */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: S.dim, marginBottom: 8 }}>Historial reciente <span style={{ fontWeight: 400, color: S.faint }}>· mantené apretado para editar o borrar</span></p>
        <div className="flex flex-col gap-2">
          {recentWorkouts.map((w) => (
            <HistoryRow key={w.id} workout={w} routines={routines}
              onOpen={() => {
                const date = new Date(w.startedAt)
                setSelectedDay({ day: date.getDate(), month: date.getMonth(), year: date.getFullYear() })
              }}
              onLongPress={() => setMenuWorkout(w)}
            />
          ))}
          {recentWorkouts.length === 0 && <p style={{ color: S.faint, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Sin historial</p>}
        </div>
      </div>

      {/* Menú del entreno (mantener apretado), igual que en Rutinas */}
      {menuWorkout && (() => {
        const routine = routines.find((r) => r.id === menuWorkout.routineId) ?? getArchivedRoutineName(menuWorkout.routineId)
        return (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setMenuWorkout(null)}>
            <Dialog label="Opciones del entreno" onClose={() => setMenuWorkout(null)} className="w-full rounded-t-3xl px-4 pt-4 pb-8 sheet-enter"
              style={{ background: S.surf, borderTop: `1px solid ${S.line2}` }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: S.ink, marginBottom: 2 }}><RoutineBadge routineId={menuWorkout.routineId} size={16} />{routine?.name ?? 'Entreno'}</p>
              <p style={{ fontSize: 12, color: S.dim, marginBottom: 16 }}>
                {new Date(menuWorkout.startedAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { const w = menuWorkout; setMenuWorkout(null); setEditingWorkout(w) }} style={opcionMenu}>
                  ✏️  Editar entreno
                </button>
                <button onClick={() => { const w = menuWorkout; setMenuWorkout(null); borrarConDeshacer(w) }}
                  style={{ ...opcionMenu, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: S.bad }}>
                  🗑  Borrar entreno
                </button>
                <button onClick={() => setMenuWorkout(null)} style={{ ...opcionMenu, background: 'none', color: S.dim, textAlign: 'center', marginTop: 4 }}>
                  Cancelar
                </button>
              </div>
            </Dialog>
          </div>
        )
      })()}

      {editingWorkout && (
        <EditWorkoutSheet workout={editingWorkout} onClose={() => setEditingWorkout(null)} />
      )}

      {selectedDay && (
        <DaySheet selectedDay={selectedDay} allWorkouts={workouts} routines={routines}
          onClose={() => setSelectedDay(null)}
          onStartWorkout={(routineId, dateOverride) => startWorkout(routineId, dateOverride)}
        />
      )}
    </div>
  )
}

/**
 * Una marca escrita con la unidad que le corresponde: kilos por repeticiones en
 * los ejercicios con peso, repeticiones solas en los de peso corporal y tiempo
 * en los isométricos y el cardio.
 */
function formatMarca(m: { kg: number; reps: number; durationSec?: number }): string {
  if (m.durationSec) return formatDuration(m.durationSec)
  if (m.kg > 0) return `${formatKg(m.kg)} kg × ${m.reps}`
  return `${m.reps} reps`
}

function RecordsTab() {
  const { prs, workouts } = useStore()
  const exercises = useAllExercises()
  const [expandedPr, setExpandedPr] = useState<string | null>(null)
  // Últimos 30 días en vez del mes calendario: todos los días 1 este contador
  // volvía a cero aunque vinieras rompiendo marcas.
  const nowTs = useHoy()
  const startOfMonth = nowTs - 30 * 86400000
  const monthPrs = prs.filter((p) => p.date >= startOfMonth)

  // Por grupo muscular, y adentro los del mes primero (los demás, del más
  // reciente al más viejo). Antes eran 30 filas iguales en una sola lista.
  const porId = new Map(exercises.map((e) => [e.id, e]))
  const grupos = (Object.keys(muscleGroupConfig) as MuscleGroup[])
    .map((g) => ({
      g,
      lista: prs
        .filter((p) => porId.get(p.exerciseId)?.muscleGroup === g)
        .sort((a, b) => Number(b.date >= startOfMonth) - Number(a.date >= startOfMonth) || b.date - a.date),
    }))
    .filter((x) => x.lista.length > 0)

  return (
    <div className="flex flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(242,169,59,0.08)', border: `1px solid rgba(242,169,59,0.22)`, borderRadius: 18, padding: 16 }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>🏆</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: S.acc2 }}>
            {monthPrs.length} {monthPrs.length === 1 ? 'récord nuevo' : 'récords nuevos'} en 30 días
          </div>
          <div style={{ fontSize: 12, color: S.dim, marginTop: 3 }}>{prs.length} récords personales en total</div>
        </div>
      </div>

      {grupos.map(({ g, lista }) => (
        <section key={g} aria-label={muscleGroupConfig[g].label} className="flex flex-col gap-2">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: S.ink, margin: '8px 0 0' }}>
            <MuscleIcon group={g} size={20} />
            {muscleGroupConfig[g].label}
            <span className="num" style={{ fontSize: 11, color: S.faint, fontWeight: 600 }}>{lista.length}</span>
          </h3>
          {lista.map((pr) => {
            const ex = porId.get(pr.exerciseId)!
            const isNew = pr.date >= startOfMonth
            const prDate = new Date(pr.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const isExpanded = expandedPr === pr.exerciseId
            const hasHistory = !!pr.history && pr.history.length > 0
            const conKilos = pr.kg > 0 && !pr.durationSec
            const desplegable = hasHistory || conKilos
            const porReps = isExpanded && conKilos ? recordsPorReps(pr.exerciseId, workouts) : []
            return (
              <div key={pr.exerciseId} style={{ background: S.surf, borderRadius: 14, border: `1px solid ${S.line2}` }}>
                <button
                  type="button"
                  onClick={() => desplegable && setExpandedPr(isExpanded ? null : pr.exerciseId)}
                  aria-expanded={desplegable ? isExpanded : undefined}
                  className="flex items-center gap-3 w-full text-left"
                  style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: desplegable ? 'pointer' : 'default', fontFamily: 'inherit', color: 'inherit' }}
                >
                  <div className="flex-1 min-w-0">
                    {/* Nombre completo, hasta dos líneas: el punto coral marca lo de los últimos 30 días. */}
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: S.ink, lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {isNew && <span aria-label="nuevo" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: S.acc, marginRight: 6, verticalAlign: 'middle', position: 'relative', top: -1 }} />}
                      {ex.nameEs}
                    </span>
                    <p style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>{prDate}</p>
                  </div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 700, color: S.ink, flexShrink: 0, textAlign: 'right' }}>{formatMarca(pr)}</div>
                  {desplegable && (
                    <span aria-hidden="true" style={{ color: S.faint, fontSize: 11, flexShrink: 0, width: 14, textAlign: 'center' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </button>
                {isExpanded && desplegable && (
                  <div style={{ padding: '10px 14px 12px', borderTop: `1px solid ${S.line}` }}>
                    {conKilos && (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 600, color: S.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mejor peso por repeticiones</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: 12, rowGap: 6, marginBottom: hasHistory ? 14 : 0 }}>
                          {porReps.map((r, i) => (
                            <div key={i} style={{ display: 'contents' }}>
                              <span className="num" style={{ fontSize: 12, color: S.dim }}>{REPS_TABLA[i]} reps</span>
                              <span className="num" style={{ fontSize: 12, fontWeight: 700, color: r ? S.ink : S.faint, textAlign: 'right' }}>{r ? `${formatKg(r.kg)} kg` : '—'}</span>
                              <span style={{ fontSize: 11, color: S.faint, minWidth: 54, textAlign: 'right' }}>
                                {r ? new Date(r.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {hasHistory && (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 600, color: S.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Historial</p>
                        <div className="flex flex-col gap-1.5">
                          {[...pr.history!].reverse().map((h, hi) => (
                            <div key={hi} className="flex items-center justify-between">
                              <span style={{ fontSize: 11, color: S.dim }}>{new Date(h.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                              <span className="num" style={{ fontSize: 11, fontWeight: 600, color: S.dim }}>{formatMarca(h)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ))}
      {prs.length === 0 && <p style={{ color: S.faint, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No hay récords aún. ¡A entrenar!</p>}
    </div>
  )
}

export function CalendarioScreen() {
  const { calendarSubTab, setCalendarSubTab } = useStore()
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(useStore.getState().agendaDayTs ?? Date.now())
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const hoy = new Date()
  const isCurrentMonth = hoy.getFullYear() === year && hoy.getMonth() === month
  const enCalendario = calendarSubTab === 'calendario'

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div style={{ flexShrink: 0, paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 22px))', paddingLeft: 22, paddingRight: 22 }}>
        {/* El mes manda: es lo primero de la pantalla y lo que filtra todo lo de abajo. */}
        {enCalendario ? (
          <div className="flex items-center justify-between">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Mes anterior"
              style={{ width: 36, height: 36, borderRadius: 12, background: S.surf2, border: `1px solid ${S.line2}`, color: S.dim, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>‹</button>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: S.ink, textAlign: 'center' }}>
              {MONTH_NAMES[month]} <span style={{ color: S.dim, fontWeight: 600 }}>{year}</span>
            </div>
            <button onClick={() => { if (!isCurrentMonth) setViewDate(new Date(year, month + 1, 1)) }} disabled={isCurrentMonth} aria-label="Mes siguiente"
              style={{ width: 36, height: 36, borderRadius: 12, background: S.surf2, border: `1px solid ${S.line2}`, color: isCurrentMonth ? S.faint : S.dim, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isCurrentMonth ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>›</button>
          </div>
        ) : (
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: S.ink, textAlign: 'center' }}>Récords</div>
        )}

        <div style={{ display: 'flex', background: S.surf, borderRadius: 14, padding: 3, border: `1px solid ${S.line2}`, marginTop: 16 }}>
          {([['calendario', '📅 Calendario'], ['records', '🏆 Récords']] as [CalendarSubTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setCalendarSubTab(id)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: calendarSubTab === id ? S.surf2 : 'transparent', color: calendarSubTab === id ? S.ink : S.dim, transition: 'all 0.15s ease-out' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 scroll-area" style={{ padding: '16px 22px 24px' }}>
        {enCalendario ? <CalendarioTab year={year} month={month} /> : <RecordsTab />}
      </div>
    </div>
  )
}
