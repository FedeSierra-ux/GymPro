import { useAllExercises, useStore } from '../store/useStore'
import { routineColor } from '../utils/trainingDays'
import { BodyFigure } from './BodyFigure'
import type { Routine } from '../types'
import { gruposDeRutina } from '../utils/routineMuscles'

interface Props {
  routine: Routine
  /** Alto de cada figura; la caja mide un poco más. */
  size?: number
  /** Con caja de fondo (listas) o sola (en línea con el texto). */
  boxed?: boolean
}

/**
 * Ícono de una rutina: la figura de frente y de espaldas con todo lo que
 * trabaja pintado, en el color de la rutina (el mismo del calendario).
 */
export function RoutineIcon({ routine, size = 18, boxed = false }: Props) {
  const exercises = useAllExercises()
  const routines = useStore((s) => s.routines)
  const color = routineColor(routine.id, routines)
  const figura = <BodyFigure niveles={gruposDeRutina(routine, exercises)} size={boxed ? size * 2 : size * 1.3} color={color} />
  if (!boxed) return figura
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: size * 2.6, height: size * 2.6, borderRadius: size * 0.6,
      background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
    }}>
      {figura}
    </span>
  )
}

/**
 * El ícono de la rutina de un entreno, en línea con el texto. Si la rutina se
 * borró, queda el emoji que tenía guardado.
 */
export function RoutineBadge({ routineId, size = 14 }: { routineId: string; size?: number }) {
  const routine = useStore((s) => s.routines.find((r) => r.id === routineId))
  const archived = useStore((s) => s.archivedRoutineNames[routineId])
  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6, marginTop: -2 }}>
      {routine ? <RoutineIcon routine={routine} size={size} /> : <span style={{ fontSize: size }}>{archived?.emoji ?? '🏋️'}</span>}
    </span>
  )
}
