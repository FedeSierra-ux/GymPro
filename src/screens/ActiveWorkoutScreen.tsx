import { useEffect, useState, useRef } from 'react'
import { Dialog } from '../components/Dialog'
import { useStore, useAllExercises } from '../store/useStore'
import { useWorkoutStore } from '../stores/workoutStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { RestTimerOverlay } from './RestTimerOverlay'
import { useRestTimerTick } from '../utils/useRestTimerTick'
import { ExerciseThumbnail } from '../components/ExerciseThumbnail'
import { ExerciseModal } from '../components/ExerciseModal'
import { vibrate, primeAudio } from '../utils/haptics'
import { useWakeLock } from '../utils/useWakeLock'
import { isDurationExercise, durationUnit, toSeconds, formatDuration } from '../utils/duration'
import { suggestNextWeight } from '../utils/progression'
import { decimalInputProps, integerInputProps, parseDecimal } from '../utils/numberInput'
import { toDateInputValue, fromDateInputValue } from '../utils/dates'
import { useLongPress } from '../utils/useLongPress'
import { ExercisePickerSheet } from '../components/ExercisePickerSheet'
import type { Exercise, ActiveWorkoutSet, PR, WorkoutSet } from '../types'
import { S } from '../theme'
import { formatKg } from '../utils/format'
import { rutinaEnUso } from '../utils/routineVariant'
import { RoutineBadge } from '../components/RoutineIcon'



const BAR_KG = 20
const PLATES = [20, 15, 10, 5, 2.5, 1.25]

function getPlates(totalKg: number): string {
  const perSide = (totalKg - BAR_KG) / 2
  if (perSide <= 0) return `Solo barra (${BAR_KG} kg)`
  const result: string[] = []
  let remaining = perSide
  for (const p of PLATES) {
    const count = Math.floor(remaining / p + 0.001)
    if (count > 0) { result.push(`${count}×${formatKg(p)} kg`); remaining -= count * p }
  }
  return result.length ? result.join(' + ') + ' / lado' : `${formatKg(perSide)} kg / lado`
}

function TipsRow({ exerciseId }: { exerciseId: string }) {
  const { exerciseTips, setExerciseTip } = useStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(exerciseTips[exerciseId] ?? '')
  const tip = exerciseTips[exerciseId]
  const handleSave = () => { setExerciseTip(exerciseId, draft.trim()); setOpen(false) }
  return (
    <div style={{ borderTop: `1px solid ${S.line}` }}>
      {!open ? (
        <button onClick={() => { setDraft(tip ?? ''); setOpen(true) }}
          className="w-full flex items-center gap-2 px-3 text-left"
          style={{ minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          <span style={{ fontSize: 13 }}>📝</span>
          <span style={{ flex: 1, fontSize: 11, color: tip ? S.dim : S.faint }}>{tip || 'Agregar tip / recordatorio de técnica...'}</span>
          <span style={{ fontSize: 11, color: S.faint }}>{tip ? '✏️' : '+'}</span>
        </button>
      ) : (
        <div style={{ padding: '8px 12px 12px' }} className="flex flex-col gap-2">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Ej: Escápulas retraídas, bajar lento 3s..."
            rows={3}
            style={{ width: '100%', background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 8, padding: '8px 12px', fontSize: 16, color: S.ink, fontFamily: 'DM Sans, system-ui, sans-serif', outline: 'none', resize: 'none' }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: S.dim, padding: '4px 12px', borderRadius: 8, border: `1px solid ${S.line2}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={handleSave} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: S.acc, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatRest(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Chip con la fecha a la que se imputa el entreno. Por defecto es hoy, pero se
 * puede mover hacia atrás para cargar una sesión de otro día.
 */
function WorkoutDatePicker({ startedAt, onChange }: { startedAt: number; onChange: (ts: number) => void }) {
  const value = toDateInputValue(startedAt)
  // Una sola lectura del reloj por montaje: el render tiene que ser puro.
  const [hoy] = useState(() => toDateInputValue(Date.now()))
  const esHoy = value === hoy
  const label = esHoy
    ? 'Hoy'
    : new Date(startedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return (
    <label
      title="Cambiar la fecha del entreno"
      style={{
        position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 10, cursor: 'pointer',
        background: esHoy ? S.surf2 : 'rgba(242,169,59,0.14)',
        border: `1px solid ${esHoy ? S.line2 : 'rgba(242,169,59,0.35)'}`,
        color: esHoy ? S.dim : S.acc2, fontSize: 11, fontWeight: 600,
      }}
    >
      <span aria-hidden="true">📅</span>
      <span>{label}</span>
      <input
        type="date"
        aria-label="Fecha del entreno"
        value={value}
        max={hoy}
        onChange={(e) => {
          const ts = fromDateInputValue(e.target.value)
          if (ts !== null) onChange(ts)
        }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', border: 'none', padding: 0, background: 'transparent',
        }}
      />
    </label>
  )
}


/**
 * Ancho de las columnas de una serie: número, kg, reps y el tilde.
 * Los ± se sacaron: ocupaban más de la mitad de la fila para algo que casi no
 * se usa (el peso se escribe), y dejaban los campos en unos 48 px de ancho con
 * botones de 32×32, imposibles de acertar con las manos transpiradas.
 */
const SET_GRID = '34px 62px minmax(0,1fr) minmax(0,1fr) 56px'

/** Fila de un menú de acciones (serie o ejercicio). */
const opcionMenu: React.CSSProperties = {
  width: '100%', textAlign: 'left', minHeight: 52,
  background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 14,
  padding: '12px 16px', color: S.ink, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif',
}
const SET_GRID_TIEMPO = '34px 62px minmax(0,1fr) 56px'

/**
 * Para cada serie del entreno, la que le corresponde de la última vez: la
 * k-ésima de calentamiento con la k-ésima de calentamiento, y lo mismo con
 * las efectivas, así agregar un calentamiento no corre toda la comparación.
 */
function emparejarAnteriores(actuales: ActiveWorkoutSet[], anteriores: WorkoutSet[]): (WorkoutSet | undefined)[] {
  const calent = anteriores.filter(s => s.isWarmup)
  const efect = anteriores.filter(s => !s.isWarmup)
  let c = 0, e = 0
  return actuales.map(s => (s.isWarmup ? calent[c++] : efect[e++]))
}

function textoAnterior(prev: WorkoutSet, byTime: boolean, unit: 'min' | 'seg'): string {
  if (byTime) {
    const seg = prev.durationSec ?? 0
    return unit === 'min' ? `${Math.round((seg / 60) * 10) / 10} min` : `${seg} s`
  }
  return prev.kg > 0 ? `${formatKg(prev.kg)}×${prev.reps}` : `${prev.reps} reps`
}

/** true si la serie hecha supera a la de la vez anterior. */
function superaAnterior(prev: WorkoutSet, kg: number, reps: number, seg: number, byTime: boolean): boolean {
  if (byTime) return seg > (prev.durationSec ?? 0)
  if (kg !== prev.kg) return kg > prev.kg
  return reps > prev.reps
}

/**
 * true si la serie supera el récord guardado (que no incluye el entreno en
 * curso). Sin récord previo no hay nada que festejar: es la primera vez.
 */
function superaRecord(pr: PR | undefined, kg: number, reps: number, seg: number, byTime: boolean): boolean {
  if (!pr) return false
  if (byTime) return seg > (pr.durationSec ?? 0)
  if (kg > 0 || pr.kg > 0) return kg > pr.kg || (kg === pr.kg && reps > pr.reps)
  return reps > pr.reps
}

/** Cuánto vale una serie para compararla con otras del mismo ejercicio. */
function pesoDeSerie(kg: number, reps: number, seg: number, byTime: boolean): number {
  return byTime ? seg : kg * 1000 + reps
}

function textoRecord(pr: PR, byTime: boolean, unit: 'min' | 'seg'): string {
  if (byTime) return unit === 'min' ? `${Math.round(((pr.durationSec ?? 0) / 60) * 10) / 10} min` : `${pr.durationSec ?? 0} s`
  return pr.kg > 0 ? `${formatKg(pr.kg)} × ${pr.reps}` : `${pr.reps} reps`
}

function estiloCampo(completada: boolean): React.CSSProperties {
  return {
    width: '100%', minWidth: 0, textAlign: 'center',
    // 16px es el mínimo con el que iOS no hace zoom al enfocar el campo.
    fontSize: 17, fontWeight: 700, minHeight: 48,
    borderRadius: 10, padding: '8px 4px',
    // Hecha: el campo se apaga, la marca verde del tilde ya dice que está lista.
    background: completada ? 'transparent' : S.surf2,
    border: `1px solid ${completada ? 'transparent' : S.line2}`,
    color: completada ? S.dim : S.ink,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
  }
}

/**
 * Tres estados del tilde: gris las que faltan, coral sólo la próxima (la única
 * que invita a tocar) y verde las hechas. Antes todas tenían borde coral y no se
 * distinguía cuál seguía.
 */
function estiloTilde(completada: boolean, esProxima: boolean, sePuede: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: '100%', minHeight: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, lineHeight: 1,
    cursor: sePuede ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
    transition: 'all 0.15s',
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  }
  // El verde lo pinta .tilde::before, que crece desde el centro al confirmar.
  if (completada) return { ...base, background: 'transparent', border: `2px solid ${S.good}`, color: '#0C0E14' }
  if (esProxima) return { ...base, background: 'rgba(232,99,74,0.12)', border: `2px solid ${S.acc}`, color: S.acc, opacity: sePuede ? 1 : 0.5 }
  return { ...base, background: 'transparent', border: `1.5px solid ${S.line2}`, color: S.faint }
}

/**
 * Una serie del entreno.
 *
 * Un solo tilde: un toque confirma, y mantenerlo apretado confirma y arranca el
 * cronómetro de descanso. Antes había dos botones casi idénticos de 36 px al
 * lado, y había que decidir entre ellos en el medio de la serie.
 */
function SetRow({
  exIdx, setIdx, set, prev, byTime, unit, isBarbellLike, puedeBorrar, esProxima, recordGuardado, esRecord,
  onUpdate, onToggleWarmup, onRemove, onComplete,
}: {
  exIdx: number
  setIdx: number
  set: ActiveWorkoutSet
  /** La serie que le corresponde de la última vez que se hizo el ejercicio. */
  prev?: WorkoutSet
  byTime: boolean
  unit: 'min' | 'seg'
  isBarbellLike: boolean
  puedeBorrar: boolean
  /** La próxima serie del entreno: la única con el tilde en coral. */
  esProxima: boolean
  /** El récord del ejercicio antes de este entreno. */
  recordGuardado?: PR
  /** Esta serie es la mejor del ejercicio y supera el récord: se marca en ámbar. */
  esRecord: boolean
  onUpdate: (e: number, s: number, f: 'kg' | 'reps' | 'duration', v: string) => void
  onToggleWarmup: (e: number, s: number) => void
  onRemove: (e: number, s: number) => void
  onComplete: (e: number, s: number, o?: { startRest?: boolean }) => void
}) {
  const [destello, setDestello] = useState(false)
  const [verDiscos, setVerDiscos] = useState(false)
  const [acciones, setAcciones] = useState(false)

  const completada = set.completed
  const calentamiento = !!set.isWarmup
  const kg = parseDecimal(set.kg) || 0
  const reps = parseInt(set.reps) || 0
  const seg = byTime ? toSeconds(set.duration ?? '', unit) : 0
  const sePuede = completada || (byTime ? seg > 0 : reps > 0)
  const mejoro = completada && !calentamiento && !!prev && superaAnterior(prev, kg, reps, seg, byTime)

  // Tocar lo de la vez anterior lo copia en los campos.
  const copiarAnterior = () => {
    if (!prev || completada) return
    if (byTime) {
      const v = unit === 'min' ? Math.round(((prev.durationSec ?? 0) / 60) * 10) / 10 : prev.durationSec ?? 0
      onUpdate(exIdx, setIdx, 'duration', String(v))
    } else {
      onUpdate(exIdx, setIdx, 'kg', String(prev.kg))
      onUpdate(exIdx, setIdx, 'reps', String(prev.reps))
    }
    vibrate(15)
  }

  const confirmar = (conDescanso: boolean) => {
    // El audio de iOS sólo arranca desde un gesto del usuario: este es el gesto.
    primeAudio()
    onComplete(exIdx, setIdx, { startRest: conDescanso })
    if (!completada && sePuede) {
      // Un récord vibra más largo, para enterarse sin mirar.
      const record = !calentamiento && superaRecord(recordGuardado, kg, reps, seg, byTime)
      vibrate(record ? [60, 40, 60, 40, 260] : conDescanso ? [40, 20, 40, 20, 40] : [40, 20, 40])
      setDestello(true)
      setTimeout(() => setDestello(false), 600)
    }
  }

  const { consumioElTap, handlers } = useLongPress(() => { if (!completada && sePuede) confirmar(true) })

  return (
    <div>
      <div
        className={destello ? 'set-complete-flash' : ''}
        style={{
          display: 'grid', gridTemplateColumns: byTime ? SET_GRID_TIEMPO : SET_GRID,
          alignItems: 'center', padding: '6px 14px', gap: 8,
          background: esRecord ? 'rgba(242,169,59,0.10)' : mejoro ? 'rgba(52,211,153,0.07)' : esProxima ? 'rgba(232,99,74,0.04)' : 'transparent',
          borderTop: `1px solid ${S.line}`,
        }}
      >
        {/*
          El número de la serie es un solo botón que abre las acciones
          secundarias. Antes esta columna tenía tres objetivos apilados de
          26×22 y 26×20, imposibles de acertar; ahora es uno de 34×48 y las
          opciones salen en filas grandes.
        */}
        <button
          onClick={() => setAcciones(true)}
          aria-label={`Serie ${setIdx + 1}${calentamiento ? ', de calentamiento' : ''}. Opciones`}
          style={{
            width: '100%', minHeight: 48, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            background: calentamiento ? 'rgba(242,169,59,0.12)' : 'none',
            border: `1px solid ${calentamiento ? 'rgba(242,169,59,0.35)' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="num" style={{ fontSize: 15, fontWeight: 700, color: calentamiento ? S.acc2 : esProxima ? S.ink : S.dim, lineHeight: 1 }}>
            {setIdx + 1}
          </span>
          {calentamiento && (
            <span style={{ fontSize: 11, fontWeight: 700, color: S.acc2, lineHeight: 1 }}>W</span>
          )}
        </button>

        {/* Lo que se hizo la vez anterior en esta serie. Tocarlo lo copia. */}
        <button
          onClick={copiarAnterior}
          disabled={!prev || completada}
          aria-label={prev ? `La vez anterior: ${textoAnterior(prev, byTime, unit)}. Tocá para copiar` : 'Sin datos de la vez anterior'}
          style={{
            width: '100%', minHeight: 48, borderRadius: 10, padding: 0,
            background: 'none', border: 'none',
            fontSize: 12, fontWeight: 600, lineHeight: 1.2,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontVariantNumeric: 'tabular-nums',
            color: mejoro ? S.good : completada ? S.faint : S.dim,
            textDecorationLine: prev && !completada ? 'underline' : 'none',
            textDecorationStyle: 'dotted',
            textUnderlineOffset: 4, textDecorationColor: S.faint,
            cursor: prev && !completada ? 'pointer' : 'default',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {prev ? textoAnterior(prev, byTime, unit) : '—'}
          {mejoro && <span style={{ display: 'block', fontSize: 11 }}>▲ mejor</span>}
        </button>

        {byTime ? (
          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <input
              {...decimalInputProps} value={set.duration ?? ''}
              aria-label={`Tiempo en ${unit === 'min' ? 'minutos' : 'segundos'}, serie ${setIdx + 1}`}
              onChange={(e) => onUpdate(exIdx, setIdx, 'duration', e.target.value)}
              placeholder="0" disabled={completada}
              style={estiloCampo(completada)}
            />
            <span style={{ fontSize: 11, color: S.faint, flexShrink: 0, width: 24 }}>{unit}</span>
          </div>
        ) : (
          <>
            <input
              {...decimalInputProps} value={set.kg}
              aria-label={`Peso en kg, serie ${setIdx + 1}`}
              onChange={(e) => onUpdate(exIdx, setIdx, 'kg', e.target.value)}
              onFocus={() => { if (isBarbellLike) setVerDiscos(true) }}
              onBlur={() => setTimeout(() => setVerDiscos(false), 200)}
              placeholder="0" disabled={completada}
              style={estiloCampo(completada)}
            />
            <input
              {...integerInputProps} value={set.reps}
              aria-label={`Repeticiones, serie ${setIdx + 1}`}
              onChange={(e) => onUpdate(exIdx, setIdx, 'reps', e.target.value)}
              placeholder="0" disabled={completada}
              style={estiloCampo(completada)}
            />
          </>
        )}

        {/* Un solo tilde: tap confirma, mantener apretado arranca el descanso */}
        <button
          {...handlers}
          aria-label={completada ? 'Desmarcar serie' : 'Confirmar serie. Mantené apretado para arrancar el descanso'}
          title={completada ? 'Desmarcar' : 'Tocá para confirmar · mantené apretado para el descanso'}
          onClick={() => { if (consumioElTap()) return; confirmar(false) }}
          className="tilde"
          data-hecha={completada}
          style={estiloTilde(completada, esProxima, sePuede)}
        >✓</button>
      </div>

      {/* Récord en el momento: la fila en ámbar y contra qué marca */}
      {esRecord && recordGuardado && (
        <div style={{ padding: '0 14px 6px', background: 'rgba(242,169,59,0.10)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: S.acc2 }}>
            🏆 Récord <span style={{ fontWeight: 500, opacity: 0.85 }}>· antes <span className="num">{textoRecord(recordGuardado, byTime, unit)}</span></span>
          </span>
        </div>
      )}

      {/* Pista de discos, debajo de la fila */}
      {(verDiscos && isBarbellLike && kg >= BAR_KG) && (
        <div style={{ padding: '4px 14px 6px', fontSize: 11, color: S.dim }}>🏋️ {getPlates(kg)}</div>
      )}

      {acciones && (
        <div className="fixed inset-0 z-[58] flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setAcciones(false)}>
          <Dialog label="Opciones de la serie" onClose={() => setAcciones(false)}
            className="w-full rounded-t-3xl px-4 pt-4 sheet-enter"
            style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: S.ink, marginBottom: 14 }}>Serie {setIdx + 1}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onToggleWarmup(exIdx, setIdx); setAcciones(false) }}
                style={{ ...opcionMenu, color: calentamiento ? S.acc2 : S.ink }}
              >
                {calentamiento ? '☑ Serie de calentamiento' : '☐ Marcar como calentamiento'}
                <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: S.dim, marginTop: 2 }}>
                  No cuenta para el volumen ni para los récords
                </span>
              </button>
              {puedeBorrar && (
                <button
                  onClick={() => { onRemove(exIdx, setIdx); setAcciones(false) }}
                  style={{ ...opcionMenu, color: S.bad }}
                >
                  🗑 Borrar esta serie
                </button>
              )}
              <button onClick={() => setAcciones(false)} style={{ ...opcionMenu, textAlign: 'center', color: S.dim, background: 'none' }}>
                Cancelar
              </button>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  )
}

export function ActiveWorkoutScreen() {
  const { routines, workouts, prs } = useStore()
  const exercises = useAllExercises()
  const {
    activeWorkout, updateSetValue, toggleSetWarmup, completeSet, addSetToExercise, removeSetFromExercise,
    finishWorkout, cancelWorkout, setWorkoutDate,
    addExerciseToWorkout, replaceExerciseInWorkout, removeExerciseFromWorkout,
  } = useWorkoutStore()

  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null)
  const [confirmAction, setConfirmAction] = useState<'finish' | 'cancel' | null>(null)
  // Índice del ejercicio cuyo menú está abierto, y qué se eligió hacer con él.
  const [menuEjercicio, setMenuEjercicio] = useState<number | null>(null)
  const [pickerPara, setPickerPara] = useState<{ modo: 'cambiar' | 'agregar'; exIdx: number } | null>(null)
  // El último ejercicio en el que se confirmó una serie: ahí sigue la próxima.
  // Se guarda el id y no la posición: agregar o sacar un ejercicio antes
  // corría el resaltado a otro.
  const [ultimoEjId, setUltimoEjId] = useState<string | null>(null)
  // Ejercicios terminados que el usuario volvió a abrir (los demás van colapsados).
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set())
  // El descanso minimizado: se guarda para qué descanso (su restEndsAt), así el
  // próximo vuelve a abrirse solo.
  const [minimizadoPara, setMinimizadoPara] = useState<number | undefined>(undefined)

  // El conteo del descanso corre acá, esté el panel abierto o minimizado.
  useRestTimerTick()

  // El fin del descanso se avisaba sólo con sonido y vibración: el lector de
  // pantalla también tiene que enterarse.
  const [avisoDescanso, setAvisoDescanso] = useState('')
  const restVisible = !!activeWorkout?.restTimerVisible
  const restLeft = activeWorkout?.restSecondsLeft ?? 0
  const estabaDescansando = useRef(false)
  useEffect(() => {
    if (estabaDescansando.current && !restVisible && restLeft === 0) {
      setAvisoDescanso('Terminó el descanso')
      const t = setTimeout(() => setAvisoDescanso(''), 4000)
      estabaDescansando.current = restVisible
      return () => clearTimeout(t)
    }
    estabaDescansando.current = restVisible
  }, [restVisible, restLeft])

  // Pantalla encendida mientras el entreno está abierto.
  useWakeLock(!!activeWorkout)

  const realStartedAt = activeWorkout?.realStartedAt
  useEffect(() => {
    if (!realStartedAt) return
    intervalRef.current = setInterval(() => setElapsed(Date.now() - realStartedAt), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [realStartedAt])

  if (!activeWorkout) return null

  const guardada = routines.find((r) => r.id === activeWorkout.routineId)
  const routine = guardada ? rutinaEnUso(guardada) : undefined
  const totalSets = activeWorkout.exercises.reduce((a, ex) => a + ex.sets.length, 0)
  const completedSets = activeWorkout.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0)
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
  const descansando = activeWorkout.restTimerVisible
  const panelDescanso = descansando && minimizadoPara !== activeWorkout.restEndsAt
  const pendiente = (i: number) => activeWorkout.exercises[i]?.sets.some((st) => !st.completed)
  const ultimoEj = ultimoEjId ? activeWorkout.exercises.findIndex((e) => e.exerciseId === ultimoEjId) : -1
  const ejActual = ultimoEj >= 0 && pendiente(ultimoEj)
    ? ultimoEj
    : activeWorkout.exercises.findIndex((_, i) => pendiente(i))
  const proximaSerie = ejActual >= 0 ? activeWorkout.exercises[ejActual].sets.findIndex((st) => !st.completed) : -1
  const confirmarSerie = (e: number, st: number, o?: { startRest?: boolean }) => {
    setUltimoEjId(activeWorkout.exercises[e]?.exerciseId ?? null)
    completeSet(e, st, o)
  }
  // Última vez que se hizo cada ejercicio, en cualquier rutina.
  const anteriores = [...workouts]
    .filter((w) => w.finishedAt && w.startedAt < activeWorkout.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
  const ultimasSeries = (exerciseId: string): WorkoutSet[] => {
    for (const w of anteriores) {
      const e = w.exercises.find((x) => x.exerciseId === exerciseId)
      if (e && e.sets.length > 0) return e.sets
    }
    return []
  }



  return (
    <div className="flex-1 min-h-0 flex flex-col screen-enter relative" style={{ background: S.bg }}>

      {/* Live PR banner */}

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '54px 22px 14px', borderBottom: `1px solid ${S.line2}` }}>
        <div className="flex items-center justify-between gap-3">
          <div style={{ fontSize: 13, color: S.dim, fontWeight: 500, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {routine && <RoutineBadge routineId={routine.id} />}{routine?.name}
          </div>
          {/* Fecha del entreno: editable para cargar el de ayer. */}
          <WorkoutDatePicker startedAt={activeWorkout.startedAt} onChange={setWorkoutDate} />
        </div>
        <div className="flex items-end justify-between gap-3" style={{ marginTop: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, color: S.ink, lineHeight: 1 }}>
              <span key={completedSets} className={completedSets > 0 ? 'cuenta-sube' : undefined}>{completedSets}</span>
              <span style={{ color: S.dim, fontSize: 15 }}> / {totalSets}</span>
              <span style={{ color: S.dim, fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, system-ui, sans-serif', letterSpacing: 0 }}> series</span>
            </div>
            {/* El reloj total, en segundo plano */}
            <div className="flex items-center gap-1.5" style={{ marginTop: 7 }} aria-label="Duración del entreno" role="timer">
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 3, background: S.acc, display: 'inline-block' }} />
              <span className="num" style={{ fontSize: 12, color: S.dim }}>{formatElapsed(elapsed)}</span>
            </div>
          </div>
          {/* Cuando corre el descanso, ocupa el lugar grande; tocarlo abre el panel. */}
          {descansando && (
            <button
              onClick={() => setMinimizadoPara(undefined)}
              aria-label={`Descanso: quedan ${formatRest(activeWorkout.restSecondsLeft)}. Tocá para abrir`}
              style={{ textAlign: 'right', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <div className="num" style={{ fontSize: 30, fontWeight: 700, color: S.acc, lineHeight: 1 }}>
                {formatRest(activeWorkout.restSecondsLeft)}
              </div>
              <div style={{ fontSize: 11, color: S.acc, fontWeight: 600, marginTop: 4 }}>descanso</div>
            </button>
          )}
        </div>
        {/* Avance del entreno: una línea fina en vez del anillo */}
        <div style={{ height: 3, background: S.line2, borderRadius: 2, marginTop: 12, overflow: 'hidden' }} aria-hidden="true">
          <div style={{ width: `${progressPct}%`, height: '100%', background: S.acc, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 min-h-0 scroll-area">
        {activeWorkout.exercises.map((activeEx, exIdx) => {
          const ex = exercises.find((e) => e.id === activeEx.exerciseId)
          if (!ex) return null
          const config = muscleGroupConfig[ex.muscleGroup]
          const pr = prs.find((p) => p.exerciseId === ex.id)
          const isBarbellLike = ex.equipmentType === 'barra'
          const prevPorSerie = emparejarAnteriores(activeEx.sets, ultimasSeries(ex.id))
          // La mejor serie hecha que supera el récord: sólo esa se marca.
          let recordIdx = -1
          let mejorValor = -1
          activeEx.sets.forEach((st, i) => {
            if (!st.completed || st.isWarmup) return
            const k = parseDecimal(st.kg) || 0
            const r = parseInt(st.reps) || 0
            const sg = isDurationExercise(ex) ? toSeconds(st.duration ?? '', durationUnit(ex)) : 0
            if (!superaRecord(pr, k, r, sg, isDurationExercise(ex))) return
            const v = pesoDeSerie(k, r, sg, isDurationExercise(ex))
            if (v > mejorValor) { mejorValor = v; recordIdx = i }
          })
          const completedCount = activeEx.sets.filter((s) => s.completed).length
          const byTime = isDurationExercise(ex)
          const unit = durationUnit(ex)
          const routineEx = routine?.exercises.find((re) => re.exerciseId === ex.id)
          // Sugerencia de doble progresión: sólo tiene sentido con kg y reps.
          const suggestion = routineEx && !byTime
            ? suggestNextWeight(ex, routineEx, workouts, ex.id)
            : null

          // Ejercicio terminado: se cierra en una línea con su resumen. Tocarlo lo abre.
          const terminado = activeEx.sets.length > 0 && completedCount === activeEx.sets.length
          if (terminado && !abiertos.has(activeEx.exerciseId)) {
            const efectivas = activeEx.sets.filter((st) => !st.isWarmup)
            const mejor = efectivas.reduce<ActiveWorkoutSet | null>((m, st) =>
              !m || (parseDecimal(st.kg) || 0) > (parseDecimal(m.kg) || 0) ? st : m, null)
            const resumen = byTime
              ? `${efectivas.length} ${efectivas.length === 1 ? 'serie' : 'series'}`
              : mejor && (parseDecimal(mejor.kg) || 0) > 0
                ? `${efectivas.length} × mejor ${formatKg(parseDecimal(mejor.kg))}×${mejor.reps}`
                : `${efectivas.length} ${efectivas.length === 1 ? 'serie' : 'series'}`
            return (
              <button
                key={activeEx.exerciseId}
                onClick={() => setAbiertos((prev) => new Set(prev).add(activeEx.exerciseId))}
                aria-label={`${ex.nameEs}, terminado: ${resumen}. Tocá para abrir`}
                style={{
                  margin: '8px 16px 0', width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 10,
                  background: 'none', border: `1px solid ${S.line}`, borderRadius: 14, padding: '10px 14px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minHeight: 48,
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 11, background: S.good, color: '#0C0E14', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: S.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.nameEs}</span>
                <span className="num" style={{ fontSize: 12, color: S.dim, flexShrink: 0 }}>{resumen}</span>
              </button>
            )
          }

          return (
            <div key={activeEx.exerciseId} style={{ margin: '12px 16px 0', background: S.surf, borderRadius: 16, overflow: 'hidden', border: `1px solid ${S.line2}` }}>

              {/* Encabezado del ejercicio */}
              <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: S.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: S.acc, border: `1px solid ${S.line2}`, flexShrink: 0 }}>
                  {exIdx + 1}
                </div>
                <button
                  onClick={() => setModalExercise(ex)}
                  aria-label={`Ver ${ex.nameEs}`}
                  style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <ExerciseThumbnail exercise={ex} size={40} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.nameEs}</div>
                  <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
                    <span style={{ color: config.color }}>{config.label}</span>
                    {pr && <span style={{ color: S.acc2 }}> · 🏆 {byTime ? formatDuration(pr.durationSec ?? 0) : pr.kg > 0 ? `${formatKg(pr.kg)}×${pr.reps}` : `${pr.reps} reps`}</span>}
                  </div>
                </div>
                {terminado ? (
                  <button
                    onClick={() => setAbiertos((prev) => { const n = new Set(prev); n.delete(activeEx.exerciseId); return n })}
                    aria-label="Cerrar el ejercicio terminado"
                    className="num"
                    style={{ fontSize: 13, fontWeight: 700, color: S.good, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 4px' }}
                  >
                    {completedCount}/{activeEx.sets.length} ▴
                  </button>
                ) : (
                  <div className="num" style={{ fontSize: 13, fontWeight: 600, color: S.dim }}>
                    {completedCount}/{activeEx.sets.length}
                  </div>
                )}
                {/* Menú del ejercicio: cambiarlo o sacarlo sin salir del entreno */}
                <button
                  onClick={() => setMenuEjercicio(exIdx)}
                  aria-label={`Opciones de ${ex.nameEs}`}
                  style={{ width: 44, height: 44, flexShrink: 0, marginRight: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: S.dim, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
                >⋯</button>
              </div>

              {/* Sugerencia de doble progresión */}
              {suggestion && (
                <div style={{
                  margin: '0 14px 10px', padding: '8px 10px', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: suggestion.reason === 'subir' ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.035)',
                  border: `1px solid ${suggestion.reason === 'subir' ? 'rgba(52,211,153,0.30)' : S.line2}`,
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>
                    {suggestion.reason === 'subir' ? '▲' : suggestion.reason === 'bajar' ? '▼' : suggestion.reason === 'primera-vez' ? '🎯' : '='}
                  </span>
                  <span style={{ flex: 1, fontSize: 11, color: suggestion.reason === 'subir' ? S.good : S.dim, lineHeight: 1.4 }}>
                    {suggestion.note}
                  </span>
                  {/* Las series arrancan con el máximo de la última vez; el
                      peso sugerido se aplica sólo si el usuario lo pide. */}
                  {suggestion.kg > 0 && activeEx.sets.some((st) => !st.completed && !st.isWarmup && parseDecimal(st.kg) !== suggestion.kg) && (
                    <button
                      onClick={() => activeEx.sets.forEach((st, si) => {
                        if (!st.completed && !st.isWarmup) updateSetValue(exIdx, si, 'kg', String(suggestion.kg))
                      })}
                      aria-label={`Usar ${formatKg(suggestion.kg)} kg en las series que faltan`}
                      style={{
                        flexShrink: 0, minHeight: 32, padding: '0 10px', borderRadius: 8,
                        background: suggestion.reason === 'subir' ? 'rgba(52,211,153,0.16)' : S.surf2,
                        border: `1px solid ${suggestion.reason === 'subir' ? 'rgba(52,211,153,0.40)' : S.line2}`,
                        color: suggestion.reason === 'subir' ? S.good : S.ink,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}
                    >
                      Usar {formatKg(suggestion.kg)} kg
                    </button>
                  )}
                </div>
              )}

              {/* Encabezado de la tabla */}
              <div style={{ display: 'grid', gridTemplateColumns: byTime ? SET_GRID_TIEMPO : SET_GRID, padding: '0 14px 6px', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, textAlign: 'center' }}>Set</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, textAlign: 'center' }}>Anterior</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, textAlign: 'center' }}>
                  {byTime ? (unit === 'min' ? 'Minutos' : 'Segundos') : 'KG'}
                </div>
                {!byTime && <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, textAlign: 'center' }}>Reps</div>}
                <div />
              </div>

              {/* Series */}
              {activeEx.sets.map((set, setIdx) => (
                <SetRow
                  key={setIdx}
                  exIdx={exIdx} setIdx={setIdx} set={set} prev={prevPorSerie[setIdx]}
                  byTime={byTime} unit={unit}
                  isBarbellLike={isBarbellLike}
                  puedeBorrar={!set.completed && activeEx.sets.length > 1}
                  onUpdate={updateSetValue}
                  onToggleWarmup={toggleSetWarmup}
                  onRemove={removeSetFromExercise}
                  esProxima={exIdx === ejActual && setIdx === proximaSerie}
                  recordGuardado={pr}
                  esRecord={setIdx === recordIdx}
                  onComplete={confirmarSerie}
                />
              ))}

              <TipsRow exerciseId={ex.id} />

              {/* Add set button */}
              <div style={{ padding: '10px 16px 14px' }}>
                <button onClick={() => addSetToExercise(exIdx)}
                  style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 10, color: S.dim, fontSize: 13, fontWeight: 600, minHeight: 44, padding: '0 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Serie
                </button>
              </div>
            </div>
          )
        })}

        {/* Sumar un ejercicio que no estaba en la rutina */}
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => setPickerPara({ modo: 'agregar', exIdx: activeWorkout.exercises.length - 1 })}
            style={{
              width: '100%', minHeight: 48, borderRadius: 14,
              background: 'none', border: `1.5px dashed ${S.line2}`,
              color: S.dim, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Agregar un ejercicio
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', paddingBottom: 36, borderTop: `1px solid ${S.line2}`, background: S.bg }}>
        <button onClick={() => setConfirmAction('cancel')}
          style={{ flex: 1, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 14, color: S.dim, fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 600, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={() => setConfirmAction('finish')}
          style={{ flex: 2, background: S.acc, border: 'none', borderRadius: 14, color: '#fff', fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 700, fontSize: 15, padding: '14px 0', cursor: 'pointer' }}>
          Terminar entreno
        </button>
      </div>

      {/* Menú del ejercicio: cambiarlo por otro o sacarlo de esta sesión */}
      {menuEjercicio !== null && (() => {
        const activeEx = activeWorkout.exercises[menuEjercicio]
        const ex = exercises.find((e) => e.id === activeEx?.exerciseId)
        const hechas = activeEx?.sets.filter((st) => st.completed).length ?? 0
        return (
          <div className="fixed inset-0 z-[55] flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setMenuEjercicio(null)}>
            <Dialog label="Opciones del ejercicio" onClose={() => setMenuEjercicio(null)}
              className="w-full rounded-t-3xl px-4 pt-4 sheet-enter"
              style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: S.ink, marginBottom: 2 }}>{ex?.nameEs}</p>
              <p style={{ fontSize: 12, color: S.dim, marginBottom: 14 }}>
                {hechas > 0 ? `${hechas} ${hechas === 1 ? 'serie hecha' : 'series hechas'} en esta sesión` : 'Todavía sin series'}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setPickerPara({ modo: 'cambiar', exIdx: menuEjercicio }); setMenuEjercicio(null) }}
                  style={opcionMenu}
                >
                  ↔️ Cambiar por otro ejercicio
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: S.dim, marginTop: 2 }}>
                    Sólo por hoy: la rutina queda igual
                  </span>
                </button>
                <button
                  onClick={() => { setPickerPara({ modo: 'agregar', exIdx: menuEjercicio }); setMenuEjercicio(null) }}
                  style={opcionMenu}
                >
                  ➕ Agregar uno después de este
                </button>
                <button
                  onClick={() => { removeExerciseFromWorkout(menuEjercicio); setMenuEjercicio(null) }}
                  style={{ ...opcionMenu, color: S.bad }}
                >
                  ⤼ Saltear este ejercicio
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: S.dim, marginTop: 2 }}>
                    {hechas > 0 ? `Se pierden las ${hechas} series cargadas` : 'Lo saca del entreno de hoy'}
                  </span>
                </button>
                <button onClick={() => setMenuEjercicio(null)} style={{ ...opcionMenu, textAlign: 'center', color: S.dim, background: 'none' }}>
                  Cancelar
                </button>
              </div>
            </Dialog>
          </div>
        )
      })()}

      {pickerPara && (
        <ExercisePickerSheet
          titulo={pickerPara.modo === 'cambiar' ? 'Cambiar por…' : 'Agregar al entreno'}
          sugeridoGrupo={
            pickerPara.modo === 'cambiar'
              ? exercises.find((e) => e.id === activeWorkout.exercises[pickerPara.exIdx]?.exerciseId)?.muscleGroup
              : undefined
          }
          excluir={activeWorkout.exercises.map((e) => e.exerciseId)}
          onPick={(id) => {
            if (pickerPara.modo === 'cambiar') replaceExerciseInWorkout(pickerPara.exIdx, id)
            else addExerciseToWorkout(id, pickerPara.exIdx)
          }}
          onClose={() => setPickerPara(null)}
        />
      )}

      <div aria-live="assertive" className="sr-only">{avisoDescanso}</div>
      {panelDescanso && <RestTimerOverlay onMinimize={() => setMinimizadoPara(activeWorkout.restEndsAt)} />}

      {/* Confirm modal */}
      {confirmAction && (
        <div className="absolute inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <Dialog label={confirmAction === 'finish' ? 'Terminar entreno' : 'Cancelar entreno'} onClose={() => setConfirmAction(null)} style={{ background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
            <h3 style={{ color: S.ink, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
              {confirmAction === 'finish' ? '¿Terminar entreno?' : '¿Cancelar entreno?'}
            </h3>
            {confirmAction === 'cancel' && (
              <p style={{ color: S.dim, fontSize: 13, marginBottom: 16 }}>Se perderá todo el progreso de esta sesión.</p>
            )}
            {confirmAction === 'finish' && totalSets - completedSets > 0 && (
              <p style={{ color: S.dim, fontSize: 13, marginBottom: 16 }}>
                {totalSets - completedSets === 1
                  ? 'Queda 1 serie sin tildar: no se guarda. Si la hiciste, volvé y tildala.'
                  : `Quedan ${totalSets - completedSets} series sin tildar: no se guardan. Si las hiciste, volvé y tildalas.`}
              </p>
            )}
            <div className="flex gap-3" style={{ marginTop: 16 }}>
              <button onClick={() => setConfirmAction(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: `1px solid ${S.line2}`, color: S.dim, fontSize: 14, fontWeight: 600, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Volver
              </button>
              <button
                onClick={() => { setConfirmAction(null); if (confirmAction === 'finish') finishWorkout(); else cancelWorkout() }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  background: confirmAction === 'finish' ? S.acc : 'rgba(239,68,68,0.15)',
                  color: confirmAction === 'finish' ? '#fff' : '#f87171',
                }}>
                {confirmAction === 'finish' ? '✓ Terminar' : '✕ Cancelar'}
              </button>
            </div>
          </Dialog>
        </div>
      )}

      {modalExercise && <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />}
    </div>
  )
}
