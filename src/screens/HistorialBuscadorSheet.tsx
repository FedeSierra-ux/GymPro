import { useMemo, useState } from 'react'
import { useHoy } from '../utils/useHoy'
import { useStore, useAllExercises } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseHistorySheet } from '../components/ExerciseHistorySheet'
import { isDurationExercise, formatDuration, totalSeconds } from '../utils/duration'
import { S } from '../theme'
import type { Workout } from '../types'
import { formatKg } from '../utils/format'

interface Resultado {
  exerciseId: string
  nombre: string
  grupo: string
  veces: number
  ultimaFecha: number
  /** Lo mejor de la última vez, ya escrito. */
  ultimaMarca: string
}

/**
 * Buscador del historial: "¿cuándo fue la última vez que hice peso muerto y con
 * cuánto?".
 *
 * Antes la única forma de contestar eso era abrir días del calendario a mano
 * hasta encontrarlo: la ficha por ejercicio existía, pero no había dónde
 * buscarla por nombre.
 */
export function HistorialBuscadorSheet({ onClose }: { onClose: () => void }) {
  const { workouts } = useStore()
  const exercises = useAllExercises()
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  // Una sola lectura del reloj por montaje: el render tiene que ser puro.
  const nowTs = useHoy()

  const resultados = useMemo<Resultado[]>(() => {
    const terminados = workouts.filter((w) => w.finishedAt)
    const acc = new Map<string, { veces: number; ultima: Workout }>()
    for (const w of terminados) {
      for (const we of w.exercises) {
        if (we.sets.length === 0) continue
        const actual = acc.get(we.exerciseId)
        if (!actual) acc.set(we.exerciseId, { veces: 1, ultima: w })
        else {
          actual.veces++
          if (w.startedAt > actual.ultima.startedAt) actual.ultima = w
        }
      }
    }

    const q = busqueda.trim().toLowerCase()
    const salida: Resultado[] = []
    for (const [exerciseId, { veces, ultima }] of acc) {
      const ex = exercises.find((e) => e.id === exerciseId)
      if (!ex) continue
      if (q && !`${ex.nameEs} ${ex.nameArg ?? ''} ${ex.equipment}`.toLowerCase().includes(q)) continue

      const sets = ultima.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? []
      const efectivas = sets.filter((s) => !s.isWarmup)
      const usar = efectivas.length > 0 ? efectivas : sets
      let marca: string
      if (isDurationExercise(ex)) {
        marca = formatDuration(totalSeconds(usar))
      } else {
        const mejor = usar.reduce((a, s) => (s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps) ? s : a), usar[0])
        marca = mejor ? (mejor.kg > 0 ? `${formatKg(mejor.kg)} kg × ${mejor.reps}` : `${mejor.reps} reps`) : '—'
        marca += ` · ${usar.length} ${usar.length === 1 ? 'serie' : 'series'}`
      }

      salida.push({
        exerciseId,
        nombre: ex.nameEs,
        grupo: ex.muscleGroup,
        veces,
        ultimaFecha: ultima.startedAt,
        ultimaMarca: marca,
      })
    }
    // Sin búsqueda, lo más reciente arriba; buscando, por nombre.
    return q
      ? salida.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      : salida.sort((a, b) => b.ultimaFecha - a.ultimaFecha)
  }, [workouts, exercises, busqueda])

  const diasAtras = (ts: number) => {
    // Días de calendario, no tandas de 24 h: lo de anoche a las 23 es "ayer".
    const medianoche = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
    const dias = Math.round((medianoche(nowTs) - medianoche(ts)) / 86400000)
    if (dias <= 0) return 'hoy'
    if (dias === 1) return 'ayer'
    if (dias < 30) return `hace ${dias} días`
    const meses = Math.round(dias / 30)
    return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl px-4 pt-4 flex flex-col sheet-enter"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, height: '86vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px', flexShrink: 0 }} />

        <div className="flex items-center justify-between gap-3 flex-shrink-0" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 17 }}>Buscar en el historial</h3>
            <p style={{ fontSize: 12, color: S.dim, marginTop: 2 }}>Cuándo lo hiciste y con cuánto</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>

        <input
          type="search"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Ej: peso muerto, sentadilla…"
          aria-label="Buscar un ejercicio en el historial"
          style={{
            flexShrink: 0, width: '100%', background: S.surf2, border: `1px solid ${S.line2}`,
            borderRadius: 12, padding: '12px 14px', fontSize: 16, color: S.ink,
            fontFamily: 'DM Sans, system-ui, sans-serif', outline: 'none', marginBottom: 12,
          }}
        />

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2" style={{ paddingBottom: 12 }}>
          {resultados.length === 0 && (
            <p style={{ color: S.faint, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              {busqueda
                ? `No entrenaste nada que coincida con «${busqueda}»`
                : 'Todavía no hay entrenos en el historial'}
            </p>
          )}
          {resultados.map((r) => {
            const cfg = muscleGroupConfig[r.grupo as keyof typeof muscleGroupConfig]
            return (
              <button
                key={r.exerciseId}
                onClick={() => setAbierto(r.exerciseId)}
                aria-label={`Ver el historial de ${r.nombre}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  background: S.surf2, border: `1px solid ${S.line2}`, borderLeft: `3px solid ${cfg?.color ?? S.line2}`,
                  borderRadius: 12, padding: '12px 14px', minHeight: 60, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: S.dim, marginTop: 3 }}>
                    {diasAtras(r.ultimaFecha)} · {r.ultimaMarca}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{r.veces}</div>
                  <div style={{ fontSize: 11, color: S.faint }}>{r.veces === 1 ? 'vez' : 'veces'}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {abierto && <ExerciseHistorySheet exerciseId={abierto} onClose={() => setAbierto(null)} />}
    </div>
  )
}
