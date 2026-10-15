import type { RoutineExercise } from '../types'
import { descansoDeNota } from './restFromNote'
import { formatDuration } from './duration'

/**
 * Modo bloque del entreno: los bloques de la rutina ("Circuito de entrada ·
 * 3 rondas", "Principal", "Tabata 20" / 10" · 4 rondas"), los circuitos y las
 * superseries, y el tabata con su cronómetro de intervalos.
 *
 * Todo lo de acá es lógica pura: la pantalla y el store la usan, y los tests
 * la cubren sin montar nada.
 *
 * Reglas (sacadas de los nombres de bloque de src/data/mileRoutines.ts):
 * - **Tabata**: el nombre del bloque dice "tabata" (sin importar mayúsculas).
 *   Manda sobre lo demás: "Tabata 20" / 10" · 4 rondas" dice "rondas" y no es
 *   un circuito.
 * - **Circuito**: el nombre dice "circuito" o "ronda(s)" ("Circuito de entrada ·
 *   3 rondas", "Finisher · 3 rondas"). Con un solo ejercicio no es circuito: son
 *   series comunes.
 * - **Superserie**: dos o más ejercicios seguidos, dentro del mismo bloque, con
 *   el mismo `supersetGroup`. Adentro de un circuito no cambia nada (el
 *   circuito ya va por rondas).
 * - "Principal", "Cardio final" o cualquier otro nombre: sólo un título.
 */

export type TipoGrupo = 'suelto' | 'superserie' | 'circuito' | 'tabata'

/** Un grupo de ejercicios que se hace junto. `indices` son posiciones en el entreno. */
export interface Grupo {
  tipo: TipoGrupo
  indices: number[]
}

export interface Bloque {
  /** El nombre del bloque en la rutina; sin nombre no lleva título. */
  nombre?: string
  tipo: 'normal' | 'circuito' | 'tabata'
  indices: number[]
  grupos: Grupo[]
}

/** Lo que el entreno necesita de cada ejercicio de la rutina. */
export type InfoRutina = Pick<RoutineExercise, 'exerciseId' | 'block' | 'supersetGroup' | 'note'>

interface SerieMin { completed: boolean }
export interface EjercicioMin {
  exerciseId: string
  sets: SerieMin[]
  /** Si se cambió por otro en este entreno: el de la rutina al que reemplaza. */
  reemplazaA?: string
}

export interface Posicion { exIdx: number; setIdx: number }

export function esTabata(nombre?: string): boolean {
  return !!nombre && /tabata/i.test(nombre)
}

export function esCircuito(nombre?: string): boolean {
  return !!nombre && !esTabata(nombre) && /circuito|\brondas?\b/i.test(nombre)
}

/** El ejercicio de la rutina que le corresponde a uno del entreno (o al que reemplazó). */
export function infoDe<T extends InfoRutina>(ej: EjercicioMin, rutina: T[]): T | undefined {
  return rutina.find((re) => re.exerciseId === ej.exerciseId)
    ?? (ej.reemplazaA ? rutina.find((re) => re.exerciseId === ej.reemplazaA) : undefined)
}

/**
 * Arma los bloques y grupos del entreno, en el orden en que está.
 *
 * Un ejercicio que no es de la rutina (agregado en el momento) no tiene
 * bloque; si quedó entre dos ejercicios del mismo bloque, se suma a ese bloque
 * para no partir un circuito al medio.
 */
export function agruparEntreno(ejercicios: EjercicioMin[], rutina: InfoRutina[]): Bloque[] {
  const infos = ejercicios.map((e) => infoDe(e, rutina))
  const bloqueDe = infos.map((i) => i?.block || undefined)
  infos.forEach((info, i) => {
    if (info) return
    const antes = bloqueDe[i - 1]
    if (antes && antes === bloqueDe[i + 1]) bloqueDe[i] = antes
  })

  const bloques: Bloque[] = []
  ejercicios.forEach((_, i) => {
    const ultimo = bloques[bloques.length - 1]
    if (ultimo && ultimo.nombre === bloqueDe[i]) ultimo.indices.push(i)
    else {
      const nombre = bloqueDe[i]
      bloques.push({ nombre, tipo: esTabata(nombre) ? 'tabata' : esCircuito(nombre) ? 'circuito' : 'normal', indices: [i], grupos: [] })
    }
  })

  for (const b of bloques) {
    if (b.tipo === 'tabata') b.grupos = [{ tipo: 'tabata', indices: b.indices }]
    else if (b.tipo === 'circuito' && b.indices.length >= 2) b.grupos = [{ tipo: 'circuito', indices: b.indices }]
    else {
      for (const i of b.indices) {
        const g = infos[i]?.supersetGroup
        const ultimo = b.grupos[b.grupos.length - 1]
        const conAnterior = !!g && ultimo != null && infos[ultimo.indices[ultimo.indices.length - 1]]?.supersetGroup === g
        if (conAnterior) {
          ultimo.indices.push(i)
          ultimo.tipo = 'superserie'
        } else {
          b.grupos.push({ tipo: 'suelto', indices: [i] })
        }
      }
    }
  }
  return bloques
}

/** true si el entreno tiene algo de modo bloque (títulos, circuitos, superseries o tabata). */
export function tieneBloques(bloques: Bloque[]): boolean {
  return bloques.some((b) => b.nombre || b.grupos.some((g) => g.tipo !== 'suelto'))
}

/** El grupo al que pertenece cada ejercicio del entreno. */
export function grupoPorEjercicio(bloques: Bloque[]): Map<number, Grupo> {
  const m = new Map<number, Grupo>()
  for (const b of bloques) for (const g of b.grupos) for (const i of g.indices) m.set(i, g)
  return m
}

/** Letra del ejercicio dentro de su grupo: A, B, C… */
export function letra(pos: number): string {
  return String.fromCharCode(65 + (pos % 26))
}

/** Cuántas rondas tiene el grupo: las series del ejercicio que más tiene. */
export function rondasDelGrupo(ejs: EjercicioMin[], g: Grupo): number {
  return Math.max(0, ...g.indices.map((i) => ejs[i]?.sets.length ?? 0))
}

/** true si todos los ejercicios del grupo que tienen la serie `r` ya la hicieron. */
export function rondaHecha(ejs: EjercicioMin[], g: Grupo, r: number): boolean {
  return g.indices.every((i) => {
    const s = ejs[i]?.sets[r]
    return !s || s.completed
  })
}

/** Rondas hechas al hilo desde la primera (las que no hay que volver a hacer). */
export function rondasHechas(ejs: EjercicioMin[], g: Grupo): number {
  const total = rondasDelGrupo(ejs, g)
  let r = 0
  while (r < total && rondaHecha(ejs, g, r)) r++
  return r
}

/**
 * La próxima serie de un grupo, por rondas: A1 → B1 → C1, después A2 → B2 →
 * C2. Un ejercicio con menos series sale de las últimas rondas. Si se tildó
 * algo salteado, sigue por la primera que falte.
 */
export function proximaEnGrupo(ejs: EjercicioMin[], g: Grupo): Posicion | null {
  const total = rondasDelGrupo(ejs, g)
  for (let r = 0; r < total; r++) {
    for (const i of g.indices) {
      const s = ejs[i]?.sets[r]
      if (s && !s.completed) return { exIdx: i, setIdx: r }
    }
  }
  return null
}

/**
 * La próxima serie del entreno: la que se resalta en coral.
 *
 * Sin grupos es lo de siempre: sigue en el último ejercicio en el que se
 * confirmó una serie mientras le falten, y si no, en el primero con series
 * pendientes. En un circuito o superserie sigue por rondas.
 */
export function proximaSerie(ejs: EjercicioMin[], bloques: Bloque[], ultimoIdx: number): Posicion | null {
  const grupos = grupoPorEjercicio(bloques)
  const pendiente = (i: number) => !!ejs[i]?.sets.some((s) => !s.completed)
  const enEjercicio = (i: number): Posicion => ({ exIdx: i, setIdx: ejs[i].sets.findIndex((s) => !s.completed) })
  const agrupado = (g?: Grupo) => !!g && g.tipo !== 'suelto'

  if (ultimoIdx >= 0 && ultimoIdx < ejs.length) {
    const g = grupos.get(ultimoIdx)
    if (g && agrupado(g)) {
      const p = proximaEnGrupo(ejs, g)
      if (p) return p
    } else if (pendiente(ultimoIdx)) return enEjercicio(ultimoIdx)
  }
  for (let i = 0; i < ejs.length; i++) {
    if (!pendiente(i)) continue
    const g = grupos.get(i)
    if (g && agrupado(g)) return proximaEnGrupo(ejs, g)
    return enEjercicio(i)
  }
  return null
}

/**
 * Al confirmar la serie `setIdx` de un circuito o superserie (con las series
 * ya actualizadas): ¿cierra la ronda? Ahí arranca el descanso; entre
 * ejercicios de la misma ronda no se descansa.
 */
export function cierraRonda(ejs: EjercicioMin[], g: Grupo, exIdx: number, setIdx: number): boolean {
  if (g.tipo !== 'circuito' && g.tipo !== 'superserie') return false
  if (!ejs[exIdx]?.sets[setIdx]?.completed) return false
  return rondaHecha(ejs, g, setIdx)
}

/**
 * El descanso al cerrar la ronda de un grupo: lo elegido a mano para alguno de
 * sus ejercicios en este entreno; si no, lo que pide alguna nota (se mira
 * desde el último, que es donde suele estar escrito) o el nombre del bloque; y
 * si no, el descanso por defecto.
 */
export function descansoDeGrupo(opts: {
  ids: string[]
  notas: (string | undefined)[]
  nombreBloque?: string
  elegidos?: Record<string, number>
  defecto: number
}): number {
  for (let k = opts.ids.length - 1; k >= 0; k--) {
    const e = opts.elegidos?.[opts.ids[k]]
    if (e) return e
  }
  for (let k = opts.notas.length - 1; k >= 0; k--) {
    const n = descansoDeNota(opts.notas[k])
    if (n) return n
  }
  return descansoDeNota(opts.nombreBloque) ?? opts.defecto
}

// ─── Tabata ───────────────────────────────────────────────────────────────

export interface ConfigTabata {
  /** Segundos de trabajo de cada intervalo. */
  trabajo: number
  /** Segundos de descanso entre intervalos. */
  descanso: number
  rondas: number
}

export const TABATA_DEFECTO: ConfigTabata = { trabajo: 20, descanso: 10, rondas: 8 }

/**
 * Lee trabajo, descanso y rondas del nombre del bloque: 'Tabata 20" / 10" ·
 * 4 rondas', "Tabata 30s/15s x 6 rondas", "Tabata 40/20". Lo que no dice,
 * va por defecto (20 / 10 / 8).
 */
export function leerTabata(nombre?: string): ConfigTabata {
  const cfg = { ...TABATA_DEFECTO }
  if (!nombre) return cfg
  const t = nombre.toLowerCase()
  const tiempos = t.match(/(\d{1,3})\s*(?:"|''|s\b|seg\b|segundos\b)?\s*\/\s*(\d{1,3})\s*(?:"|''|s\b|seg\b|segundos\b)?/)
  if (tiempos) {
    const tr = parseInt(tiempos[1], 10)
    const de = parseInt(tiempos[2], 10)
    if (tr >= 5 && tr <= 300) cfg.trabajo = tr
    if (de >= 0 && de <= 300) cfg.descanso = de
  }
  const rondas = t.match(/(\d{1,2})\s*rondas?\b/)
  if (rondas) {
    const r = parseInt(rondas[1], 10)
    if (r >= 1 && r <= 30) cfg.rondas = r
  }
  return cfg
}

export interface Tramo {
  tipo: 'trabajo' | 'descanso'
  /** Ronda (desde 0) a la que pertenece. */
  ronda: number
  /** En el trabajo, el ejercicio que se hace; en el descanso, el que viene. */
  ejercicio: number
  /** Segundos desde el arranque del tabata. */
  inicio: number
  fin: number
}

/**
 * La línea de tiempo: en cada ronda, cada ejercicio un intervalo de trabajo,
 * con un descanso entre uno y otro (también entre rondas). Así se ve en la
 * maqueta: "Ronda 2/4" · "Ejercicio 2 de 4". Después del último trabajo no hay
 * descanso: el tabata termina ahí.
 *
 * `desdeRonda` arranca de una ronda más adelante (si ya se hicieron algunas).
 */
export function lineaTabata(cfg: ConfigTabata, ejercicios: number, desdeRonda = 0): Tramo[] {
  const tramos: Tramo[] = []
  let t = 0
  for (let r = desdeRonda; r < cfg.rondas; r++) {
    for (let e = 0; e < ejercicios; e++) {
      tramos.push({ tipo: 'trabajo', ronda: r, ejercicio: e, inicio: t, fin: t + cfg.trabajo })
      t += cfg.trabajo
      const ultimo = r === cfg.rondas - 1 && e === ejercicios - 1
      if (!ultimo && cfg.descanso > 0) {
        const sigue = e + 1 < ejercicios ? e + 1 : 0
        tramos.push({ tipo: 'descanso', ronda: e + 1 < ejercicios ? r : r + 1, ejercicio: sigue, inicio: t, fin: t + cfg.descanso })
        t += cfg.descanso
      }
    }
  }
  return tramos
}

export function duracionTabata(tramos: Tramo[]): number {
  return tramos.length ? tramos[tramos.length - 1].fin : 0
}

export interface EstadoTabata {
  /** Índice del tramo en curso (el último si terminó). */
  idx: number
  tramo: Tramo | undefined
  /** Segundos que le quedan al tramo, redondeados para arriba (como el descanso). */
  restante: number
  /** Segundos que le quedan a todo el tabata. */
  restanteTotal: number
  terminado: boolean
}

/** Dónde está el tabata a los `t` segundos del arranque. */
export function estadoTabata(tramos: Tramo[], t: number): EstadoTabata {
  const total = duracionTabata(tramos)
  if (tramos.length === 0 || t >= total) {
    return { idx: Math.max(0, tramos.length - 1), tramo: tramos[tramos.length - 1], restante: 0, restanteTotal: 0, terminado: true }
  }
  const tt = Math.max(0, t)
  const idx = tramos.findIndex((x) => tt < x.fin)
  const tramo = tramos[idx]
  return {
    idx,
    tramo,
    restante: Math.max(0, Math.ceil(tramo.fin - tt - 1e-9)),
    restanteTotal: Math.max(0, Math.ceil(total - tt - 1e-9)),
    terminado: false,
  }
}

/**
 * Hasta qué ronda (absoluta, sin incluir) se completó el tabata a los `t`
 * segundos: una ronda cuenta cuando terminó su último intervalo de trabajo.
 */
export function rondaAlcanzada(tramos: Tramo[], t: number, desdeRonda = 0): number {
  let hasta = desdeRonda
  const porRonda = new Map<number, number>()
  for (const x of tramos) if (x.tipo === 'trabajo') porRonda.set(x.ronda, x.fin)
  for (const [r, fin] of [...porRonda.entries()].sort((a, b) => a[0] - b[0])) {
    if (fin <= t + 1e-9) hasta = r + 1
    else break
  }
  return hasta
}

/** Adónde lleva "Saltar": al principio del tramo siguiente (o al final). */
export function tiempoSaltar(tramos: Tramo[], t: number): number {
  const { idx, terminado } = estadoTabata(tramos, t)
  if (terminado) return duracionTabata(tramos)
  return tramos[idx].fin
}

/**
 * Adónde lleva "Anterior": al principio del intervalo de trabajo en curso si
 * ya pasaron más de 2 s, y si no al del trabajo anterior. En un descanso, al
 * trabajo que se acaba de hacer.
 */
export function tiempoAnterior(tramos: Tramo[], t: number): number {
  const { idx, tramo } = estadoTabata(tramos, t)
  if (!tramo) return 0
  const trabajos = tramos.map((x, i) => ({ x, i })).filter(({ x, i }) => x.tipo === 'trabajo' && i <= idx)
  if (trabajos.length === 0) return 0
  const actual = trabajos[trabajos.length - 1]
  if (tramo.tipo === 'trabajo' && t - tramo.inicio <= 2 && trabajos.length >= 2) return trabajos[trabajos.length - 2].x.inicio
  return actual.x.inicio
}

export type EventoTabata =
  | { tipo: 'cuenta'; n: number }
  | { tipo: 'tramo'; idx: number }
  | { tipo: 'fin' }

/**
 * Qué avisar entre dos lecturas del reloj: el 3-2-1 antes de cambiar de tramo,
 * el cambio de tramo y el final. Si el teléfono estuvo dormido y saltaron
 * varios segundos, sólo vale lo último (no una ráfaga de pitidos).
 */
export function eventosTabata(tramos: Tramo[], antes: number, ahora: number): EventoTabata[] {
  if (ahora <= antes || tramos.length === 0) return []
  const total = duracionTabata(tramos)
  if (antes >= total) return []
  const saltoLargo = ahora - antes > 1.5
  if (ahora >= total) return [{ tipo: 'fin' }]
  const a = estadoTabata(tramos, antes)
  const b = estadoTabata(tramos, ahora)
  if (b.idx !== a.idx) return [{ tipo: 'tramo', idx: b.idx }]
  if (saltoLargo) return []
  const ev: EventoTabata[] = []
  for (const n of [3, 2, 1]) {
    // Se cruzó el segundo n antes del final del tramo.
    const marca = b.tramo!.fin - n
    if (antes < marca && ahora >= marca) ev.push({ tipo: 'cuenta', n })
  }
  return ev
}

/** Las series que marca el tabata: las que faltan de las rondas [desde, hasta). */
export function seriesDelTabata(ejs: EjercicioMin[], g: Grupo, desde: number, hasta: number): Posicion[] {
  const out: Posicion[] = []
  for (let r = desde; r < hasta; r++) {
    for (const i of g.indices) {
      const s = ejs[i]?.sets[r]
      if (s && !s.completed) out.push({ exIdx: i, setIdx: r })
    }
  }
  return out
}

/**
 * Qué escribir en una serie del tabata antes de marcarla, si está vacía (no
 * se puede tildar una serie sin reps o sin tiempo). Lo prellenado de la vez
 * anterior se respeta; si no hay nada, las reps mínimas del plan, o los
 * segundos de trabajo en los ejercicios por tiempo.
 */
export function rellenoTabata(opts: {
  porTiempo: boolean
  unidad: 'min' | 'seg'
  duracion?: string
  reps: string
  repsMin?: number
  trabajo: number
}): { campo: 'reps' | 'duration'; valor: string } | null {
  if (opts.porTiempo) {
    const v = parseFloat((opts.duracion ?? '').replace(',', '.'))
    if (isFinite(v) && v > 0) return null
    const valor = opts.unidad === 'seg' ? String(opts.trabajo) : String(Math.round((opts.trabajo / 60) * 10) / 10)
    return { campo: 'duration', valor }
  }
  if ((parseInt(opts.reps, 10) || 0) > 0) return null
  return { campo: 'reps', valor: String(Math.max(1, opts.repsMin ?? 1)) }
}

/** "m:ss". */
export function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** El título corto del bloque, sin las rondas: 'Tabata 20" / 10"'. */
export function tituloCorto(nombre: string): string {
  return nombre.split('·')[0].trim() || nombre
}

/** Lo que pide la rutina para un ejercicio del tabata: "10–15 reps" o "20 s" ("10–15" en corto). */
export function objetivoTabata(re?: Pick<RoutineExercise, 'repsMin' | 'repsMax' | 'targetSeconds'>, corto = false): string {
  if (!re) return ''
  if (re.targetSeconds) return formatDuration(re.targetSeconds)
  const r = re.repsMin === re.repsMax ? `${re.repsMin}` : `${re.repsMin}–${re.repsMax}`
  return corto ? r : `${r} reps`
}
