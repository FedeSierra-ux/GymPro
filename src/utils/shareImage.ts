import type { MuscleGroup } from '../types'
import { figuraPorNiveles, sexoDeNiveles } from '../data/muscleIcons'

/**
 * Imagen de un entreno terminado, en formato historia (1080 × 1920), para
 * mandar o subir desde el menú de compartir del teléfono.
 */
export interface DatosImagen {
  rutina: string
  fecha: number
  /** Color de la rutina (el del calendario). */
  color: string
  duracionMin: number
  series: number
  volumenKg: number
  records: number
  /** Grupos trabajados, de 0 a 1 según las series. */
  niveles: Partial<Record<MuscleGroup, number>>
  ejercicios: { nombre: string; detalle: string }[]
}

export const W = 1080
export const H = 1920
export const BG = '#0C0E14'
export const SURF = '#161821'
export const INK = '#ECEEF4'
export const DIM = '#8A91A3'
export const AMBER = '#F2A93B'
export const SANS = '"DM Sans", system-ui, sans-serif'
export const MONO = '"JetBrains Mono", ui-monospace, monospace'

function figura(ctx: CanvasRenderingContext2D, lado: 'frente' | 'espalda', niveles: DatosImagen['niveles'], x: number, y: number, alto: number, color: string) {
  const { vb, partes } = figuraPorNiveles(lado, niveles, sexoDeNiveles(niveles))
  const escala = alto / vb[3]
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(escala, escala)
  ctx.translate(-vb[0], -vb[1])
  ctx.fillStyle = color
  for (const { paths, nivel } of partes) {
    ctx.globalAlpha = 0.2 + 0.8 * nivel
    for (const d of paths) ctx.fill(new Path2D(d))
  }
  ctx.restore()
}

/** Corta el texto con "…" para que entre en `ancho`. */
export function ajustar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > ancho) t = t.slice(0, -1)
  return t + '…'
}

/** Un lienzo de historia (1080 × 1920) con las fuentes de la app ya cargadas. */
export async function lienzoHistoria(): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  // Las fuentes de la app tienen que estar cargadas o el canvas usa las del sistema.
  try { await document.fonts?.ready } catch { /* sigue con lo que haya */ }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo armar la imagen')
  return { canvas, ctx }
}

export function aPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo armar la imagen'))), 'image/png'),
  )
}

/** Parte el texto en renglones que entran en `ancho`. */
export function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = []
  let linea = ''
  for (const palabra of texto.split(/\s+/)) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (linea && ctx.measureText(prueba).width > ancho) {
      out.push(linea)
      linea = palabra
    } else {
      linea = prueba
    }
  }
  if (linea) out.push(linea)
  return out
}

export async function generarImagenEntreno(d: DatosImagen): Promise<Blob> {
  const { canvas, ctx } = await lienzoHistoria()

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  // Franja con el color de la rutina, arriba.
  ctx.fillStyle = d.color
  ctx.fillRect(0, 0, W, 14)

  const M = 90
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = DIM
  ctx.font = `600 34px ${SANS}`
  const fecha = new Date(d.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  ctx.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), M, 190)
  ctx.fillStyle = INK
  ctx.font = `800 76px ${SANS}`
  ctx.fillText(ajustar(ctx, d.rutina, W - 2 * M), M, 290)

  // Mapa del cuerpo de lo trabajado, frente y espalda.
  const alto = 600
  const ancho = alto * 0.5
  figura(ctx, 'frente', d.niveles, W / 2 - ancho - 20, 360, alto, d.color)
  figura(ctx, 'espalda', d.niveles, W / 2 + 20, 360, alto, d.color)

  // Cifras en una grilla de 2 × 2.
  const cifras: [string, string, string?][] = [
    [`${d.duracionMin}`, 'minutos'],
    [`${d.series}`, 'series'],
    [`${Math.round(d.volumenKg).toLocaleString('es-AR')}`, 'kg de volumen'],
    [`${d.records}`, d.records === 1 ? 'récord' : 'récords', d.records > 0 ? AMBER : undefined],
  ]
  const top = 1000
  const colW = (W - 2 * M - 30) / 2
  cifras.forEach(([valor, etiqueta, color], i) => {
    const x = M + (i % 2) * (colW + 30)
    const y = top + Math.floor(i / 2) * 190
    ctx.fillStyle = SURF
    ctx.beginPath()
    ctx.roundRect(x, y, colW, 165, 28)
    ctx.fill()
    ctx.fillStyle = color ?? INK
    ctx.font = `700 70px ${MONO}`
    ctx.fillText(valor, x + 36, y + 92)
    ctx.fillStyle = DIM
    ctx.font = `500 32px ${SANS}`
    ctx.fillText(etiqueta, x + 36, y + 140)
  })

  // Los mejores ejercicios.
  let y = top + 2 * 190 + 70
  for (const e of d.ejercicios.slice(0, 4)) {
    ctx.fillStyle = INK
    ctx.font = `600 36px ${SANS}`
    ctx.fillText(ajustar(ctx, e.nombre, W - 2 * M - 300), M, y)
    ctx.fillStyle = DIM
    ctx.font = `600 34px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(e.detalle, W - M, y)
    ctx.textAlign = 'left'
    y += 64
  }

  ctx.fillStyle = DIM
  ctx.font = `700 30px ${SANS}`
  ctx.fillText('GymPro', M, H - 80)

  return aPng(canvas)
}

export type ResultadoCompartir = 'compartido' | 'descargado' | 'cancelado'

/** Abre el menú de compartir con la imagen; si el teléfono no puede, la descarga. */
export async function compartirImagen(blob: Blob, nombre: string): Promise<ResultadoCompartir> {
  const file = new File([blob], nombre, { type: 'image/png' })
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'compartido'
    } catch (e) {
      if (e instanceof Error && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'descargado'
}
