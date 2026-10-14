import type { MuscleGroup } from '../types'
import { muscleColors } from '../../design-tokens.js'

/** Los colores salen de design-tokens.js (un solo lugar para toda la app). */
export const muscleGroupConfig: Record<MuscleGroup, { label: string; color: string }> = {
  pecho: { label: 'Pecho', color: muscleColors.pecho },
  espalda: { label: 'Espalda', color: muscleColors.espalda },
  hombros: { label: 'Hombros', color: muscleColors.hombros },
  biceps: { label: 'Bíceps', color: muscleColors.biceps },
  triceps: { label: 'Tríceps', color: muscleColors.triceps },
  piernas: { label: 'Piernas', color: muscleColors.piernas },
  gluteos: { label: 'Glúteos', color: muscleColors.gluteos },
  core: { label: 'Core/Abs', color: muscleColors.core },
  cardio: { label: 'Cardio', color: muscleColors.cardio },
}
