export type MuscleGroup =
  | 'pecho' | 'espalda' | 'hombros' | 'biceps'
  | 'triceps' | 'piernas' | 'gluteos' | 'core' | 'cardio'

export type ExerciseEquipment =
  | 'barra' | 'mancuernas' | 'cable' | 'maquina'
  | 'peso_corporal' | 'kettlebell' | 'banda' | 'cardio_maquina'

/**
 * Cómo se registra el ejercicio. 'weight_reps' es kg × repeticiones (el default
 * histórico); 'duration' es tiempo, y se usa para cardio (cinta) y para los
 * isométricos del circuito (planchas, sentadilla contra la pared).
 */
export type TrackingType = 'weight_reps' | 'duration'

export interface Exercise {
  id: string
  nameEs: string
  nameArg?: string   // nombre vernacular argentino (ej: "Press de Banco")
  nameEn?: string    // nombre en inglés para búsqueda en wger API
  muscleGroup: MuscleGroup
  primaryMuscles: string[]
  equipment: string
  equipmentType?: ExerciseEquipment
  wgerId?: number
  image?: string     // GIF URL de ExerciseDB (hardcodeado para los 79 ejercicios base)
  /** Slug del catálogo de ilustraciones (public/exercise-frames). Ver utils/exerciseMatch. */
  frameSlug?: string
  /** true para los ejercicios que creó el usuario a mano. */
  isCustom?: boolean
  /** Ejercicio propio borrado: no se ofrece para elegir, pero el historial lo sigue nombrando. */
  archived?: boolean
  /** Por defecto 'weight_reps'. */
  trackingType?: TrackingType
  /** Unidad que se muestra en los ejercicios por tiempo. Cardio en minutos, isométricos en segundos. */
  durationUnit?: 'min' | 'seg'
  instructions?: string[]
}

export interface RoutineExercise {
  exerciseId: string
  sets: number
  repsMin: number
  repsMax: number
  order: number
  /** Objetivo en segundos para los ejercicios por tiempo (ignora repsMin/repsMax). */
  targetSeconds?: number
  /** Aclaración del plan: "10 por lado", "descanso 2 min", etc. */
  note?: string
  /** Bloque al que pertenece ("Circuito de entrada · 3 rondas", "Tabata"): se muestra como encabezado. */
  block?: string
  /** Ejercicios consecutivos con el mismo valor forman una superserie. */
  supersetGroup?: string
  /** Series y reps de las semanas 4-6, si el plan las cambia. */
  alt?: RoutineVariant
}

export interface RoutineVariant {
  sets: number
  repsMin: number
  repsMax: number
  targetSeconds?: number
}

export interface Routine {
  id: string
  name: string
  emoji: string
  exercises: RoutineExercise[]
  createdAt: number
  /** Qué series y reps se usan: las de base (semanas 1-3) o las de `alt` (semanas 4-6). */
  variante?: 'base' | 'alt'
  /** Posición en la paleta de colores. Se fija al crearla para que borrar otra no la recoloree. */
  color?: number
}

export interface WorkoutSet {
  kg: number
  reps: number
  completedAt: number
  isWarmup?: boolean
  /** Duración registrada, en segundos, para los ejercicios por tiempo. */
  durationSec?: number
}

export interface WorkoutExercise {
  exerciseId: string
  sets: WorkoutSet[]
}

export type WorkoutOrigen = 'en-vivo' | 'manual' | 'auto'

export interface Workout {
  id: string
  routineId: string
  startedAt: number
  finishedAt?: number
  durationMin?: number
  exercises: WorkoutExercise[]
  /**
   * Cómo se registró: en vivo en el gimnasio, cargado después a mano (desde la
   * Agenda o cambiándole el día) o cerrado solo a las 4 horas. Los cargados a
   * mano tienen una hora inventada y una duración que es lo que se tardó en
   * cargarlos, y los cerrados solos una duración fija: los informes no los usan
   * para medir horarios ni duraciones. Los entrenos viejos no lo tienen.
   */
  origen?: WorkoutOrigen
  /** Semana del plan por semanas (1-6) en que se hizo, si había uno en curso. */
  semanaPrograma?: number
  /** Con qué series se hizo la rutina: las de Semanas 1-3 ('base') o las de 4-6 ('alt'). Sólo en rutinas con variante. */
  variante?: 'base' | 'alt'
  /** @deprecated Se calculaba como minutos × 6,5 para cualquier persona. Sólo queda para leer entrenos viejos. */
  kcal?: number
}

export interface PR {
  exerciseId: string
  kg: number
  reps: number
  /** Marca de los ejercicios por tiempo (plancha, cinta). */
  durationSec?: number
  date: number
  history?: Array<{ kg: number; reps: number; durationSec?: number; date: number }>
}

/**
 * Una medición del cuerpo. El peso es el único campo obligatorio; el resto se
 * carga si a uno le interesa seguirlo.
 */
export interface BodyMeasure {
  id: string
  /** Fecha a la que corresponde la medición (mediodía local). */
  date: number
  /** Peso corporal en kg. */
  weightKg?: number
  /** Circunferencias en cm. */
  cintura?: number
  pecho?: number
  brazo?: number
  pierna?: number
  cadera?: number
  note?: string
}

export type MedidaKey = 'weightKg' | 'cintura' | 'pecho' | 'brazo' | 'pierna' | 'cadera'

export type NavTab = 'home' | 'rutinas' | 'calendario' | 'progreso' | 'perfil'
export type CalendarSubTab = 'calendario' | 'records'

export interface AppToast {
  id: string
  message: string
  type: 'success' | 'pr' | 'info'
  /**
   * Si está, el aviso muestra un botón "Deshacer" que llama a esta función.
   * Es la red de seguridad de los borrados: más rápida y más amable que un
   * modal de confirmación, y sirve también cuando el error se nota después.
   */
  undo?: () => void
}

export interface ActiveWorkoutSet {
  kg: string
  reps: string
  completed: boolean
  isWarmup?: boolean
  /** Lo que se escribe en el campo de tiempo, en la unidad del ejercicio. */
  duration?: string
  /** Momento real (reloj de pared) en que se tildó la serie. */
  completedAt?: number
  /**
   * Se escribió algo en la serie durante este entreno. Lo prellenado de la vez
   * anterior no cuenta: así "cargada sin tildar" quiere decir que la hiciste.
   */
  editada?: boolean
}

export interface ActiveWorkoutExercise {
  exerciseId: string
  sets: ActiveWorkoutSet[]
  /**
   * Si se cambió por otro en este entreno ("Cambiar por otro ejercicio"): el de
   * la rutina al que reemplaza. Así hereda su bloque y su superserie y no parte
   * un circuito al medio.
   */
  reemplazaA?: string
}

export type ExerciseTips = Record<string, string>

export interface AppSettings {
  anthropicApiKey: string
  openAiApiKey: string
  aiProvider: 'anthropic' | 'openai' | 'none'
}
