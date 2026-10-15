import { Fragment, useEffect, useState, useRef } from 'react'
import { Dialog } from '../components/Dialog'
import { useStore, useAllExercises } from '../store/useStore'
import { seriesCargadas, useWorkoutStore } from '../stores/workoutStore'
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
import type { Exercise, ActiveWorkoutExercise, ActiveWorkoutSet, PR, WorkoutSet } from '../types'
import { S } from '../theme'
import { formatKg } from '../utils/format'
import { rutinaEnUso } from '../utils/routineVariant'
import { RoutineBadge } from '../components/RoutineIcon'
import { TabataOverlay } from './TabataOverlay'
import {
  agruparEntreno, descansoDeGrupo, duracionTabata, infoDe, leerTabata, letra, lineaTabata, objetivoTabata, proximaEnGrupo,
  proximaSerie, rondaHecha, rondasDelGrupo, rondasHechas, seriesDelTabata, type Bloque, type Grupo,
} from '../utils/bloques'



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
          style={{ minHeight: 44, background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: 13 }}>📝</span>
          <span style={{ flex: 1, fontSize: 11, color: tip ? S.dim : S.mute }}>{tip || 'Agregar tip / recordatorio de técnica...'}</span>
          <span style={{ fontSize: 11, color: S.mute }}>{tip ? '✏️' : '+'}</span>
        </button>
      ) : (
        <div style={{ padding: '8px 12px 12px' }} className="flex flex-col gap-2">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Ej: Escápulas retraídas, bajar lento 3s..."
            rows={3}
            style={{ width: '100%', background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 8, padding: '8px 12px', fontSize: 15, color: S.ink, outline: 'none', resize: 'none' }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: S.dim, padding: '4px 12px', borderRadius: 8, border: `1px solid ${S.line2}`, background: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} style={{ fontSize: 11, fontWeight: 700, color: S.onAcc, background: S.acc, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Guardar</button>
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

function IconoReloj() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>
    </svg>
  )
}

function IconoAbajo() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Título de un bloque entre tarjetas, como en el detalle de la rutina. */
function EncabezadoBloque({ nombre, cantidad, primero }: { nombre: string; cantidad: number; primero: boolean }) {
  return (
    <div className="flex items-baseline justify-between" style={{ margin: primero ? '16px 18px 0' : '22px 18px 0', gap: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: S.ink, minWidth: 0 }}>{nombre}</h3>
      <span style={{ fontSize: 11, color: S.mute, flexShrink: 0 }}>{cantidad} {cantidad === 1 ? 'ejercicio' : 'ejercicios'}</span>
    </div>
  )
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
        padding: '5px 10px', borderRadius: 12, cursor: 'pointer',
        background: esHoy ? S.surf2 : 'rgba(56,189,248,0.12)',
        border: `1px solid ${esHoy ? S.line2 : 'rgba(56,189,248,0.35)'}`,
        color: esHoy ? S.dim : S.info, fontSize: 11, fontWeight: 600,
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
  background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12,
  padding: '12px 16px', color: S.ink, fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
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

/** Con `unidad`, el campo lleva la unidad chiquita abajo del número. */
function ConUnidad({ unidad, children }: { unidad?: string; children: React.ReactNode }) {
  if (!unidad) return <>{children}</>
  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      {children}
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 5, textAlign: 'center', fontSize: 11, fontWeight: 500, color: S.mute, pointerEvents: 'none', lineHeight: 1 }}>{unidad}</span>
    </div>
  )
}

function estiloCampo(completada: boolean, conUnidad = false): React.CSSProperties {
  return {
    width: '100%', minWidth: 0, textAlign: 'center',
    // 16px es el mínimo con el que iOS no hace zoom al enfocar el campo.
    fontSize: 17, fontWeight: 700, minHeight: 48,
    borderRadius: 10, padding: conUnidad ? '2px 4px 14px' : '8px 4px',
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
    cursor: sePuede ? 'pointer' : 'not-allowed',
    transition: 'all 0.15s',
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  }
  // El verde lo pinta .tilde::before, que crece desde el centro al confirmar.
  if (completada) return { ...base, background: 'transparent', border: `2px solid ${S.good}`, color: S.bg }
  if (esProxima) return { ...base, background: 'rgba(232,99,74,0.12)', border: `2px solid ${S.acc}`, color: S.acc, opacity: sePuede ? 1 : 0.5 }
  return { ...base, background: 'transparent', border: `1.5px solid ${S.line2}`, color: S.mute }
}

/**
 * Una serie del entreno.
 *
 * Un solo tilde: un toque confirma, y mantenerlo apretado confirma y arranca el
 * cronómetro de descanso. Antes había dos botones casi idénticos de 36 px al
 * lado, y había que decidir entre ellos en el medio de la serie.
 */
/** El cierre del descanso, encima del entreno: anillo lleno en verde y "¡A la serie!". */
function FinDescanso() {
  const size = 200
  const r = (size - 10) / 2
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center descanso-fin" style={{ background: 'rgba(12,14,20,0.97)', pointerEvents: 'none' }} aria-hidden="true">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={S.good} strokeWidth={10} />
        </svg>
        <span className="absolute" style={{ fontSize: 64, fontWeight: 700, color: S.good, lineHeight: 1 }}>✓</span>
      </div>
      <p style={{ marginTop: 24, fontSize: 26, fontWeight: 700, color: S.ink }}>¡A la serie!</p>
    </div>
  )
}

function SetRow({
  exIdx, setIdx, set, prev, byTime, unit, isBarbellLike, puedeBorrar, esProxima, recordGuardado, esRecord, pulso,
  onUpdate, onToggleWarmup, onRemove, onComplete, unidades = false,
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
  /** Terminó el descanso: la próxima serie late dos veces para encontrarla. */
  pulso?: boolean
  onUpdate: (e: number, s: number, f: 'kg' | 'reps' | 'duration', v: string) => void
  onToggleWarmup: (e: number, s: number) => void
  onRemove: (e: number, s: number) => void
  onComplete: (e: number, s: number, o?: { startRest?: boolean }) => void
  /**
   * La unidad adentro del campo ("kg", "reps"). En circuitos y superseries no
   * hay encabezado de tabla: cada ejercicio muestra una sola fila.
   */
  unidades?: boolean
}) {
  const [destello, setDestello] = useState<'serie' | 'record' | null>(null)
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
      setDestello(record ? 'record' : 'serie')
      setTimeout(() => setDestello(null), record ? 900 : 600)
    }
  }

  const { consumioElTap, handlers } = useLongPress(() => { if (!completada && sePuede) confirmar(true) })

  return (
    <div>
      <div
        className={[destello === 'record' ? 'record-flash' : destello ? 'set-complete-flash' : '', pulso ? 'proxima-pulso' : ''].join(' ').trim() || undefined}
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
            width: '100%', minHeight: 48, borderRadius: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            background: calentamiento ? S.surf2 : 'none',
            border: `1px solid ${calentamiento ? S.line2 : 'transparent'}`,
            cursor: 'pointer',
          }}
        >
          <span className="num" style={{ fontSize: 15, fontWeight: 700, color: calentamiento ? S.dim : esProxima ? S.ink : S.dim, lineHeight: 1 }}>
            {setIdx + 1}
          </span>
          {calentamiento && (
            <span style={{ fontSize: 11, fontWeight: 700, color: S.mute, lineHeight: 1 }}>W</span>
          )}
        </button>

        {/* Lo que se hizo la vez anterior en esta serie. Tocarlo lo copia. */}
        <button
          onClick={copiarAnterior}
          disabled={!prev || completada}
          aria-label={prev ? `La vez anterior: ${textoAnterior(prev, byTime, unit)}. Tocá para copiar` : 'Sin datos de la vez anterior'}
          style={{
            width: '100%', minHeight: 48, borderRadius: 12, padding: 0,
            background: 'none', border: 'none',
            fontSize: 12, fontWeight: 600, lineHeight: 1.2,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontVariantNumeric: 'tabular-nums',
            color: mejoro ? S.good : completada ? S.mute : S.dim,
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
            <span style={{ fontSize: 11, color: S.mute, flexShrink: 0, width: 24 }}>{unit}</span>
          </div>
        ) : (
          <>
            <ConUnidad unidad={unidades ? 'kg' : undefined}>
              <input
                {...decimalInputProps} value={set.kg}
                aria-label={`Peso en kg, serie ${setIdx + 1}`}
                onChange={(e) => onUpdate(exIdx, setIdx, 'kg', e.target.value)}
                onFocus={() => { if (isBarbellLike) setVerDiscos(true) }}
                onBlur={() => setTimeout(() => setVerDiscos(false), 200)}
                placeholder="0" disabled={completada}
                style={estiloCampo(completada, unidades)}
              />
            </ConUnidad>
            <ConUnidad unidad={unidades ? 'reps' : undefined}>
              <input
                {...integerInputProps} value={set.reps}
                aria-label={`Repeticiones, serie ${setIdx + 1}`}
                onChange={(e) => onUpdate(exIdx, setIdx, 'reps', e.target.value)}
                placeholder="0" disabled={completada}
                style={estiloCampo(completada, unidades)}
              />
            </ConUnidad>
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
                style={{ ...opcionMenu, color: S.ink }}
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
    addExerciseToWorkout, replaceExerciseInWorkout, removeExerciseFromWorkout, empezarTabata,
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
  // En circuitos y superseries se ve sólo la serie de la ronda; estos muestran todas.
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set())
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
  // Cierre visual del descanso: el panel no desaparece en seco, muestra
  // "¡A la serie!" con el anillo lleno en verde (o el contador del encabezado
  // destella, si estaba minimizado) y la próxima serie late dos veces.
  const [finDescanso, setFinDescanso] = useState<{ conPanel: boolean } | null>(null)
  const restEndsAt = activeWorkout?.restEndsAt
  useEffect(() => {
    if (estabaDescansando.current && !restVisible && restLeft === 0) {
      setAvisoDescanso('Terminó el descanso')
      setFinDescanso({ conPanel: minimizadoPara !== restEndsAt })
      const t = setTimeout(() => setAvisoDescanso(''), 4000)
      const t2 = setTimeout(() => setFinDescanso(null), 1400)
      estabaDescansando.current = restVisible
      return () => { clearTimeout(t); clearTimeout(t2) }
    }
    estabaDescansando.current = restVisible
  }, [restVisible, restLeft, minimizadoPara, restEndsAt])

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
  // Bloques, circuitos y superseries de la rutina (ver utils/bloques.ts). Una
  // rutina sin nada de eso da un solo bloque sin nombre con todo suelto, y se
  // ve igual que siempre.
  const bloques = agruparEntreno(activeWorkout.exercises, guardada?.exercises ?? [])
  const ultimoEj = ultimoEjId ? activeWorkout.exercises.findIndex((e) => e.exerciseId === ultimoEjId) : -1
  // La próxima serie: lineal en lo suelto, por rondas en circuitos y superseries.
  const proxima = proximaSerie(activeWorkout.exercises, bloques, ultimoEj)
  const ejActual = proxima?.exIdx ?? -1
  const serieProxima = proxima?.setIdx ?? -1
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

  /** Lo que necesita la tarjeta de un ejercicio: récord, la vez anterior, sugerencia. */
  const datosDe = (activeEx: ActiveWorkoutExercise) => {
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
    const terminado = activeEx.sets.length > 0 && completedCount === activeEx.sets.length
    return { ex, config, pr, isBarbellLike, prevPorSerie, recordIdx, completedCount, byTime, unit, routineEx, suggestion, terminado }
  }
  type Datos = NonNullable<ReturnType<typeof datosDe>>

  /** Ejercicio terminado, cerrado en una línea con su resumen. Tocarlo lo abre. */
  const filaTerminado = (d: Datos, activeEx: ActiveWorkoutExercise, abrir: () => void) => {
    const efectivas = activeEx.sets.filter((st) => !st.isWarmup)
    const mejor = efectivas.reduce<ActiveWorkoutSet | null>((m, st) =>
      !m || (parseDecimal(st.kg) || 0) > (parseDecimal(m.kg) || 0) ? st : m, null)
    const resumen = d.byTime
      ? `${efectivas.length} ${efectivas.length === 1 ? 'serie' : 'series'}`
      : mejor && (parseDecimal(mejor.kg) || 0) > 0
        ? `${efectivas.length} × mejor ${formatKg(parseDecimal(mejor.kg))}×${mejor.reps}`
        : `${efectivas.length} ${efectivas.length === 1 ? 'serie' : 'series'}`
    return (
      <button
        key={activeEx.exerciseId}
        onClick={abrir}
        aria-label={`${d.ex.nameEs}, terminado: ${resumen}. Tocá para abrir`}
        style={{
          margin: '8px 16px 0', width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: `1px solid ${S.line}`, borderRadius: 12, padding: '10px 14px',
          cursor: 'pointer', textAlign: 'left', minHeight: 48,
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 11, background: S.good, color: S.bg, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: S.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ex.nameEs}</span>
        <span className="num" style={{ fontSize: 12, color: S.dim, flexShrink: 0 }}>{resumen}</span>
      </button>
    )
  }

  /**
   * Nombre, nota de la rutina (en ámbar, como en el detalle) y grupo muscular
   * con el récord. En circuitos y superseries (`compacto`) el nombre puede ir en
   * dos renglones y, si hay nota, va sólo la nota, como en la maqueta.
   */
  const nombreDe = (d: Datos, compacto = false) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={compacto
        ? { fontSize: 15, fontWeight: 700, color: S.ink, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'break-word' }
        : { fontSize: 15, fontWeight: 700, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ex.nameEs}</div>
      {d.routineEx?.note && (
        <div style={{ fontSize: 12, color: S.acc2, marginTop: 2, lineHeight: 1.35 }}>{d.routineEx.note}</div>
      )}
      {!(compacto && d.routineEx?.note) && <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
        <span style={{ color: d.config.color }}>{d.config.label}</span>
        {d.pr && <span style={{ color: S.acc2 }}> · 🏆 {d.byTime ? formatDuration(d.pr.durationSec ?? 0) : d.pr.kg > 0 ? `${formatKg(d.pr.kg)}×${d.pr.reps}` : `${d.pr.reps} reps`}</span>}
      </div>}
    </div>
  )

  const miniatura = (d: Datos) => (
    <button
      onClick={() => setModalExercise(d.ex)}
      aria-label={`Ver ${d.ex.nameEs}`}
      style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <ExerciseThumbnail exercise={d.ex} size={40} />
    </button>
  )

  /** Menú del ejercicio: cambiarlo o sacarlo sin salir del entreno */
  const botonMenu = (d: Datos, exIdx: number) => (
    <button
      onClick={() => setMenuEjercicio(exIdx)}
      aria-label={`Opciones de ${d.ex.nameEs}`}
      style={{ width: 44, height: 44, flexShrink: 0, marginRight: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: S.dim, fontSize: 17, cursor: 'pointer', lineHeight: 1 }}
    >⋯</button>
  )

  /** Sugerencia de doble progresión */
  const sugerenciaDe = (d: Datos, activeEx: ActiveWorkoutExercise, exIdx: number) => {
    const suggestion = d.suggestion
    if (!suggestion) return null
    return (
      <div style={{
        margin: '0 14px 10px', padding: '8px 10px', borderRadius: 12,
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
              fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Usar {formatKg(suggestion.kg)} kg
          </button>
        )}
      </div>
    )
  }

  const filaDe = (d: Datos, activeEx: ActiveWorkoutExercise, exIdx: number, setIdx: number, unidades = false) => {
    const set = activeEx.sets[setIdx]
    return (
      <SetRow
        key={setIdx}
        exIdx={exIdx} setIdx={setIdx} set={set} prev={d.prevPorSerie[setIdx]}
        byTime={d.byTime} unit={d.unit}
        isBarbellLike={d.isBarbellLike}
        puedeBorrar={!set.completed && activeEx.sets.length > 1}
        onUpdate={updateSetValue}
        onToggleWarmup={toggleSetWarmup}
        onRemove={removeSetFromExercise}
        esProxima={exIdx === ejActual && setIdx === serieProxima}
        pulso={finDescanso != null && exIdx === ejActual && setIdx === serieProxima}
        recordGuardado={d.pr}
        esRecord={setIdx === d.recordIdx}
        onComplete={confirmarSerie}
        unidades={unidades}
      />
    )
  }

  const botonSerie = (label: string, onClick: () => void) => (
    <button onClick={onClick}
      style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12, color: S.dim, fontSize: 13, fontWeight: 600, minHeight: 44, padding: '0 18px', cursor: 'pointer' }}>
      {label}
    </button>
  )

  /** La tarjeta de un ejercicio suelto: la de siempre. */
  const tarjetaEjercicio = (activeEx: ActiveWorkoutExercise, exIdx: number) => {
    const d = datosDe(activeEx)
    if (!d) return null
    const { byTime, unit, completedCount, terminado } = d

    if (terminado && !abiertos.has(activeEx.exerciseId)) {
      return filaTerminado(d, activeEx, () => setAbiertos((prev) => new Set(prev).add(activeEx.exerciseId)))
    }

    return (
      <div key={activeEx.exerciseId} style={{ margin: '12px 16px 0', background: S.surf, borderRadius: 16, overflow: 'hidden', border: `1px solid ${S.line2}` }}>

        {/* Encabezado del ejercicio */}
        <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 12, background: S.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: S.acc, border: `1px solid ${S.line2}`, flexShrink: 0 }}>
            {exIdx + 1}
          </div>
          {miniatura(d)}
          {nombreDe(d)}
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
          {botonMenu(d, exIdx)}
        </div>

        {sugerenciaDe(d, activeEx, exIdx)}

        {/* Encabezado de la tabla */}
        <div style={{ display: 'grid', gridTemplateColumns: byTime ? SET_GRID_TIEMPO : SET_GRID, padding: '0 14px 6px', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.mute, textAlign: 'center' }}>Set</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.mute, textAlign: 'center' }}>Anterior</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.mute, textAlign: 'center' }}>
            {byTime ? (unit === 'min' ? 'Minutos' : 'Segundos') : 'KG'}
          </div>
          {!byTime && <div style={{ fontSize: 11, fontWeight: 600, color: S.mute, textAlign: 'center' }}>Reps</div>}
          <div />
        </div>

        {/* Series */}
        {activeEx.sets.map((_, setIdx) => filaDe(d, activeEx, exIdx, setIdx))}

        <TipsRow exerciseId={d.ex.id} />

        {/* Add set button */}
        <div style={{ padding: '10px 16px 14px' }}>
          {botonSerie('+ Serie', () => addSetToExercise(exIdx))}
        </div>
      </div>
    )
  }

  /**
   * Circuito o superserie: una sola tarjeta con la ronda, los ejercicios con
   * letra (A, B, C) y, de cada uno, la serie de la ronda en curso. La próxima
   * va por rondas y el descanso arranca al cerrar la ronda.
   */
  const tarjetaGrupo = (g: Grupo, bloque: Bloque) => {
    const ejs = activeWorkout.exercises
    const clave = `g:${ejs[g.indices[0]].exerciseId}`
    const datos = g.indices.map((i) => datosDe(ejs[i]))
    const total = rondasDelGrupo(ejs, g)
    const prox = proximaEnGrupo(ejs, g)
    const hecho = !prox
    const abierto = abiertos.has(clave)
    if (hecho && !abierto) {
      return g.indices.map((i, k) => {
        const d = datos[k]
        return d ? filaTerminado(d, ejs[i], () => setAbiertos((prev) => new Set(prev).add(clave))) : null
      })
    }
    const ronda = prox ? prox.setIdx : total - 1
    const superserie = g.tipo === 'superserie'
    const hechas = Array.from({ length: total }, (_, r) => rondaHecha(ejs, g, r))
    const cantHechas = hechas.filter(Boolean).length
    const ultimaSerie = activeWorkout.lastCompletedSet
    // El descanso que corre es de este grupo si lo arrancó el cierre de una ronda acá.
    const descansoDeEste = descansando && !!ultimaSerie
      && g.indices.some((i) => ejs[i].exerciseId === ultimaSerie.exerciseId)
      && rondaHecha(ejs, g, ultimaSerie.setIdx)
    const descanso = descansoDeGrupo({
      ids: g.indices.map((i) => ejs[i].exerciseId),
      notas: g.indices.map((i) => infoDe(ejs[i], guardada?.exercises ?? [])?.note),
      nombreBloque: bloque.nombre,
      elegidos: activeWorkout.restPorEjercicio,
      defecto: activeWorkout.restDefaultSeconds ?? 75,
    })
    const tipoNombre = superserie ? 'Superserie' : 'Circuito'

    return (
      <div key={clave} style={{ margin: '12px 16px 0', background: S.surf, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(232,99,74,0.35)' }}
        role="group" aria-label={`${tipoNombre}${bloque.nombre && !superserie ? ` ${bloque.nombre}` : ''}, ronda ${ronda + 1} de ${total}`}>
        {/* La ronda */}
        <div style={{ padding: '12px 14px 11px', background: 'rgba(232,99,74,0.06)', borderBottom: `1px solid ${S.line}` }}>
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              {superserie && <div style={{ fontSize: 11, fontWeight: 700, color: S.acc, letterSpacing: '0.02em' }}>Superserie</div>}
              <div style={{ fontSize: 15, fontWeight: 700, color: S.ink }}>
                {hecho ? `${total} de ${total} rondas` : `Ronda ${ronda + 1} de ${total}`}
              </div>
            </div>
            <div className="flex" style={{ gap: 4, flexShrink: 1, minWidth: 0 }} role="img"
              aria-label={`${cantHechas} de ${total} ${total === 1 ? 'ronda hecha' : 'rondas hechas'}`}>
              {hechas.map((ok, r) => (
                <i key={r} style={{ width: 22, flexShrink: 1, minWidth: 6, height: 5, borderRadius: 3, display: 'block', background: ok ? S.good : r === ronda ? S.acc : S.line2 }} />
              ))}
            </div>
          </div>
          {!hecho ? (
            <div className="flex items-center" style={{ gap: 6, marginTop: 6, fontSize: 12, color: S.dim }}>
              <IconoReloj />
              {descansoDeEste && ultimaSerie
                ? <span>Ronda {ultimaSerie.setIdx + 1} cerrada: descanso <span className="num">{formatRest(activeWorkout.restTotalSeconds)}</span> corriendo</span>
                : <span>Descanso <span className="num">{formatRest(descanso)}</span> al cerrar la ronda</span>}
            </div>
          ) : (
            <button
              onClick={() => setAbiertos((prev) => { const n = new Set(prev); n.delete(clave); return n })}
              aria-label={`Cerrar ${tipoNombre.toLowerCase()} terminado`}
              style={{ marginTop: 4, minHeight: 44, padding: 0, background: 'none', border: 'none', color: S.good, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Hecho ▴
            </button>
          )}
        </div>

        {g.indices.map((exIdx, k) => {
          const d = datos[k]
          if (!d) return null
          const activeEx = ejs[exIdx]
          const expandido = hecho || expandidos.has(activeEx.exerciseId)
          const actual = ejActual === exIdx
          const siguienteHot = k < g.indices.length - 1 && ejActual === g.indices[k + 1]
          return (
            <Fragment key={activeEx.exerciseId}>
              <div style={{ padding: k === 0 ? '12px 14px 8px' : '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10, borderTop: k === 0 ? 'none' : `1px solid ${S.line}` }}>
                {/* La letra y la miniatura; en pantallas angostas la letra va sobre la miniatura (index.css). */}
                <div className="grupo-ident" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div aria-hidden="true" className="grupo-letra" style={{
                    width: 32, height: 32, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: actual ? S.acc : S.surf2, color: actual ? S.onAcc : S.acc,
                    border: `1px solid ${actual ? S.acc : S.line2}`,
                  }}>
                    {letra(k)}
                  </div>
                  {miniatura(d)}
                </div>
                {nombreDe(d, true)}
                <button
                  onClick={() => setExpandidos((prev) => { const n = new Set(prev); if (n.has(activeEx.exerciseId)) n.delete(activeEx.exerciseId); else n.add(activeEx.exerciseId); return n })}
                  disabled={hecho}
                  aria-label={`${letra(k)}: ${d.completedCount} de ${activeEx.sets.length} series. ${expandido ? 'Tocá para ver sólo la ronda' : 'Tocá para ver todas'}`}
                  aria-expanded={expandido}
                  className="num"
                  style={{ fontSize: 13, fontWeight: d.terminado ? 700 : 600, color: d.terminado ? S.good : S.dim, background: 'none', border: 'none', cursor: hecho ? 'default' : 'pointer', minHeight: 44, minWidth: 44, padding: '0 4px' }}
                >
                  {d.completedCount}/{activeEx.sets.length}{!hecho && expandido ? ' ▴' : ''}
                </button>
                {botonMenu(d, exIdx)}
              </div>

              {expandido && sugerenciaDe(d, activeEx, exIdx)}
              {expandido
                ? activeEx.sets.map((_, setIdx) => filaDe(d, activeEx, exIdx, setIdx, true))
                : activeEx.sets[ronda] && filaDe(d, activeEx, exIdx, ronda, true)}
              {expandido && !hecho && (
                <>
                  <TipsRow exerciseId={d.ex.id} />
                  <div style={{ padding: '10px 16px 12px' }}>{botonSerie('+ Serie', () => addSetToExercise(exIdx))}</div>
                </>
              )}

              {/* Entre ejercicios de la misma ronda no se descansa */}
              {k < g.indices.length - 1 && !hecho && (
                <div className="flex items-center" style={{
                  gap: 6, padding: '5px 14px 5px 26px', fontSize: 11, borderTop: `1px solid ${S.line}`,
                  background: 'rgba(236,238,244,0.015)', color: siguienteHot ? S.acc : S.mute, fontWeight: siguienteHot ? 600 : 400,
                }}>
                  <IconoAbajo />
                  {siguienteHot ? `Seguí con ${letra(k + 1)}, sin descanso` : 'Sin descanso'}
                </div>
              )}
            </Fragment>
          )
        })}

        {!hecho && (
          <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${S.line}` }}>
            {botonSerie('+ Ronda', () => g.indices.forEach((i) => addSetToExercise(i)))}
          </div>
        )}
      </div>
    )
  }

  /** El tabata en la lista: los ejercicios, cuánto dura y el botón que abre el cronómetro. */
  const tarjetaTabata = (g: Grupo, bloque: Bloque) => {
    const ejs = activeWorkout.exercises
    const clave = `t:${ejs[g.indices[0]].exerciseId}`
    const datos = g.indices.map((i) => datosDe(ejs[i]))
    const todas = g.indices.every((i) => ejs[i].sets.every((st) => st.completed))
    if (todas && !abiertos.has(clave)) {
      return g.indices.map((i, k) => {
        const d = datos[k]
        return d ? filaTerminado(d, ejs[i], () => setAbiertos((prev) => new Set(prev).add(clave))) : null
      })
    }
    const cfg = leerTabata(bloque.nombre)
    const hechas = rondasHechas(ejs, g)
    const faltan = seriesDelTabata(ejs, g, hechas, cfg.rondas).length
    const duracion = duracionTabata(lineaTabata(cfg, g.indices.length))
    const minutos = Math.max(1, Math.round(duracion / 60))
    const pendienteTabata = hechas < cfg.rondas && faltan > 0
    return (
      <div key={clave} style={{ margin: '12px 16px 0', background: S.surf, borderRadius: 16, overflow: 'hidden', border: `1px solid ${S.line2}`, paddingBottom: 14 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0' }}>
          {g.indices.map((exIdx, k) => {
            const d = datos[k]
            if (!d) return null
            return (
              <li key={ejs[exIdx].exerciseId} className="flex items-center" style={{ gap: 10, padding: '7px 14px', fontSize: 13, color: S.ink }}>
                <span className="num" aria-hidden="true" style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 700, color: d.terminado ? S.good : S.acc, flexShrink: 0 }}>
                  {d.terminado ? '✓' : k + 1}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.ex.nameEs}{d.terminado && <span className="sr-only"> (hecho)</span>}
                </span>
                <span className="num" style={{ marginLeft: 'auto', fontSize: 12, color: S.dim, flexShrink: 0 }}>{objetivoTabata(d.routineEx, true)}</span>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center" style={{ gap: 6, padding: '0 14px', fontSize: 12, color: S.dim }}>
          <IconoReloj />
          <span><span className="num">{minutos}</span> min · {cfg.trabajo} s de trabajo y {cfg.descanso} s de descanso</span>
        </div>
        {hechas > 0 && (
          <div style={{ padding: '6px 14px 0', fontSize: 12, color: S.good, fontWeight: 600 }}>
            {Math.min(hechas, cfg.rondas)} de {cfg.rondas} rondas hechas
          </div>
        )}
        {pendienteTabata ? (
          <>
            <div style={{ padding: '12px 14px 0' }}>
              <button
                onClick={() => { primeAudio(); empezarTabata(g.indices[0]) }}
                className="flex items-center justify-center"
                style={{ width: '100%', minHeight: 48, gap: 8, borderRadius: 12, background: S.acc, color: S.onAcc, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
                {hechas > 0 ? `Seguir tabata · ronda ${hechas + 1}` : 'Empezar tabata'}
              </button>
            </div>
            <p style={{ padding: '8px 14px 0', fontSize: 11, color: S.mute, textAlign: 'center' }}>
              Al terminar se marcan las {faltan} series del bloque
            </p>
          </>
        ) : todas && (
          <div style={{ padding: '6px 14px 0' }}>
            <button
              onClick={() => setAbiertos((prev) => { const n = new Set(prev); n.delete(clave); return n })}
              style={{ minHeight: 44, padding: 0, background: 'none', border: 'none', color: S.good, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Hecho ▴
            </button>
          </div>
        )}
      </div>
    )
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
              <span style={{ color: S.dim, fontSize: 13, fontWeight: 500, letterSpacing: 0 }}> series</span>
            </div>
            {/* El reloj total, en segundo plano */}
            <div className="flex items-center gap-1.5" style={{ marginTop: 7 }} aria-label="Duración del entreno" role="timer">
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 3, background: S.acc, display: 'inline-block' }} />
              <span className="num" style={{ fontSize: 12, color: S.dim }}>{formatElapsed(elapsed)}</span>
            </div>
          </div>
          {/* Cuando corre el descanso, ocupa el lugar grande; tocarlo abre el panel. */}
          {!descansando && finDescanso && !finDescanso.conPanel && (
            <div className="destello-verde" role="status" style={{ textAlign: 'right', borderRadius: 12, padding: '4px 8px' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: S.good, lineHeight: 1.2 }}>¡A la serie!</div>
            </div>
          )}
          {descansando && (
            <button
              onClick={() => setMinimizadoPara(undefined)}
              aria-label={`Descanso: quedan ${formatRest(activeWorkout.restSecondsLeft)}. Tocá para abrir`}
              style={{ textAlign: 'right', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div className={`num${activeWorkout.restSecondsLeft <= 3 ? ' late' : ''}`} style={{ fontSize: 32, fontWeight: 700, color: activeWorkout.restSecondsLeft <= 10 ? S.good : S.acc, lineHeight: 1 }}>
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
        {bloques.map((bloque, bi) => (
          <Fragment key={`${bi}-${bloque.nombre ?? ''}`}>
            {bloque.nombre && (
              <EncabezadoBloque nombre={bloque.nombre} cantidad={bloque.indices.length} primero={bi === 0} />
            )}
            {bloque.grupos.map((g) => (
              g.tipo === 'suelto'
                ? <Fragment key={activeWorkout.exercises[g.indices[0]].exerciseId}>{tarjetaEjercicio(activeWorkout.exercises[g.indices[0]], g.indices[0])}</Fragment>
                : g.tipo === 'tabata'
                  ? <Fragment key={`t-${activeWorkout.exercises[g.indices[0]].exerciseId}`}>{tarjetaTabata(g, bloque)}</Fragment>
                  : <Fragment key={`g-${activeWorkout.exercises[g.indices[0]].exerciseId}`}>{tarjetaGrupo(g, bloque)}</Fragment>
            ))}
          </Fragment>
        ))}

        {/* Sumar un ejercicio que no estaba en la rutina */}
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => setPickerPara({ modo: 'agregar', exIdx: activeWorkout.exercises.length - 1 })}
            style={{
              width: '100%', minHeight: 48, borderRadius: 12,
              background: 'none', border: `1.5px dashed ${S.line2}`,
              color: S.dim, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
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
          style={{ flex: 1, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 12, color: S.dim, fontWeight: 600, fontSize: 15, padding: '14px 0', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={() => setConfirmAction('finish')}
          style={{ flex: 2, background: S.acc, border: 'none', borderRadius: 12, color: S.onAcc, fontWeight: 700, fontSize: 15, padding: '14px 0', cursor: 'pointer' }}>
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
      {/* El cronómetro del tabata tapa todo; la pantalla sigue encendida por el useWakeLock de arriba. */}
      {activeWorkout.tabata && <TabataOverlay />}
      {!descansando && finDescanso?.conPanel && <FinDescanso />}

      {/* Confirmar terminar o cancelar */}
      {confirmAction && (() => {
        const terminar = confirmAction === 'finish'
        // Lo cargado sin tildar se puede guardar igual: es la última serie que
        // uno hizo y se olvidó de confirmar (antes se perdía, y el récord con ella).
        const cargadas = terminar ? seriesCargadas(activeWorkout, exercises) : []
        const sinHacer = activeWorkout.exercises
          .filter((ex, i) => !ex.sets.some((st) => st.completed) && !cargadas.some((c) => c.exIdx === i))
          .map((ex) => exercises.find((e) => e.id === ex.exerciseId)?.nameEs ?? 'Ejercicio')
        const nombres = sinHacer.length <= 2
          ? sinHacer.join(' y ')
          : `${sinHacer.slice(0, 2).join(', ')} y ${sinHacer.length - 2} más`
        const boton = { padding: '13px 0', borderRadius: 16, fontSize: 13, cursor: 'pointer', width: '100%' } as const
        return (
          <div className="absolute inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <Dialog label={terminar ? 'Terminar entreno' : 'Cancelar entreno'} onClose={() => setConfirmAction(null)} style={{ background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
              <h3 style={{ color: S.ink, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
                {terminar ? '¿Terminar entreno?' : '¿Cancelar entreno?'}
              </h3>
              {!terminar && (
                <p style={{ color: S.dim, fontSize: 13 }}>Se perderá todo el progreso de esta sesión.</p>
              )}
              {terminar && (
                <div className="flex flex-col" style={{ gap: 6, color: S.dim, fontSize: 13, lineHeight: 1.45 }}>
                  <p>
                    Hiciste <b className="num" style={{ color: S.ink }}>{completedSets}</b> de <span className="num">{totalSets}</span> series.
                  </p>
                  {cargadas.length > 0 && (
                    <p style={{ color: S.ink }}>
                      {cargadas.length === 1
                        ? '1 serie tiene datos cargados sin tildar.'
                        : `${cargadas.length} series tienen datos cargados sin tildar.`}
                    </p>
                  )}
                  {sinHacer.length > 0 && (
                    <p>
                      {sinHacer.length === 1 ? 'Te falta 1 ejercicio' : `Te faltan ${sinHacer.length} ejercicios`}: {nombres}.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col" style={{ gap: 8, marginTop: 18 }}>
                {terminar && cargadas.length > 0 ? (
                  <>
                    <button onClick={() => { setConfirmAction(null); finishWorkout({ incluirCargadas: true }) }}
                      style={{ ...boton, border: 'none', fontWeight: 700, background: S.acc, color: S.onAcc }}>
                      Guardar también {cargadas.length === 1 ? 'esa' : 'esas'}
                    </button>
                    {completedSets > 0 && (
                      <button onClick={() => { setConfirmAction(null); finishWorkout() }}
                        style={{ ...boton, fontWeight: 600, background: 'none', border: `1px solid ${S.line2}`, color: S.ink }}>
                        Terminar sin {cargadas.length === 1 ? 'ella' : 'ellas'}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => { setConfirmAction(null); if (terminar) finishWorkout(); else cancelWorkout() }}
                    style={{
                      ...boton, border: 'none', fontWeight: 700,
                      background: terminar ? S.acc : 'rgba(248,113,113,0.15)',
                      color: terminar ? S.onAcc : S.bad,
                    }}>
                    {terminar ? 'Terminar' : 'Cancelar entreno'}
                  </button>
                )}
                <button onClick={() => setConfirmAction(null)}
                  style={{ ...boton, fontWeight: 600, background: 'none', border: 'none', color: S.dim }}>
                  {terminar ? 'Seguir entrenando' : 'Volver'}
                </button>
              </div>
            </Dialog>
          </div>
        )
      })()}

      {modalExercise && <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />}
    </div>
  )
}
