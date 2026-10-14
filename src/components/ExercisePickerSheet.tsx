import { useMemo, useState } from 'react'
import { useAllExercises } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseThumbnail } from './ExerciseThumbnail'
import { S } from '../theme'
import type { Exercise, MuscleGroup } from '../types'

/**
 * Hoja para elegir un ejercicio sin salir de donde estás.
 *
 * La usa el entreno en curso: si la máquina está ocupada, se cambia el
 * ejercicio por otro acá mismo en vez de tener que cancelar el entreno, editar
 * la rutina y volver a empezar.
 */
export function ExercisePickerSheet({
  titulo, sugeridoGrupo, excluir = [], onPick, onClose,
}: {
  titulo: string
  /** Grupo muscular del ejercicio que se está reemplazando: se ofrece primero. */
  sugeridoGrupo?: MuscleGroup
  /** Ejercicios que ya están en el entreno. */
  excluir?: string[]
  onPick: (exerciseId: string) => void
  onClose: () => void
}) {
  const exercises = useAllExercises()
  const [busqueda, setBusqueda] = useState('')
  const [grupo, setGrupo] = useState<MuscleGroup | null>(sugeridoGrupo ?? null)

  const excluidos = useMemo(() => new Set(excluir), [excluir])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return exercises
      .filter((e) => !excluidos.has(e.id) && !e.archived)
      .filter((e) => (grupo ? e.muscleGroup === grupo : true))
      .filter((e) => !q || `${e.nameEs} ${e.nameArg ?? ''} ${e.equipment}`.toLowerCase().includes(q))
      .sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es', { sensitivity: 'base' }))
      .slice(0, 60)
  }, [exercises, excluidos, grupo, busqueda])

  const grupos = Object.keys(muscleGroupConfig) as MuscleGroup[]

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl px-4 pt-4 flex flex-col sheet-enter"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, height: '86vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px', flexShrink: 0 }} />

        <div className="flex items-center justify-between gap-3 flex-shrink-0" style={{ marginBottom: 12 }}>
          <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 17 }}>{titulo}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un ejercicio…"
          aria-label="Buscar un ejercicio"
          style={{
            flexShrink: 0, width: '100%', background: S.surf2, border: `1px solid ${S.line2}`,
            borderRadius: 12, padding: '12px 14px', fontSize: 15, color: S.ink, outline: 'none',
          }}
        />

        <div
          className="flex gap-2 flex-shrink-0"
          style={{ margin: '10px 0', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}
        >
          <button
            onClick={() => setGrupo(null)}
            style={chipStyle(grupo === null, S.acc)}
          >Todos</button>
          {grupos.map((mg) => {
            const cfg = muscleGroupConfig[mg]
            return (
              <button key={mg} onClick={() => setGrupo(grupo === mg ? null : mg)} style={chipStyle(grupo === mg, cfg.color)}>
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2" style={{ paddingBottom: 12 }}>
          {lista.length === 0 && (
            <p style={{ color: S.mute, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              Ningún ejercicio coincide con «{busqueda}»
            </p>
          )}
          {lista.map((ex: Exercise) => {
            const cfg = muscleGroupConfig[ex.muscleGroup]
            return (
              <button
                key={ex.id}
                onClick={() => { onPick(ex.id); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12,
                  padding: 10, minHeight: 60, cursor: 'pointer',
                }}
              >
                <ExerciseThumbnail exercise={ex} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.nameEs}
                  </div>
                  <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
                    <span style={{ color: cfg.color }}>{cfg.label}</span> · {ex.equipment}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function chipStyle(activo: boolean, color: string): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 20, flexShrink: 0, minHeight: 40, whiteSpace: 'nowrap',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: activo ? color + '33' : S.surf2,
    border: `1px solid ${activo ? color : S.line2}`,
    color: activo ? color : S.dim,
  }
}
