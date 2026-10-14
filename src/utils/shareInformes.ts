import type { TarjetaAnio } from './informes'
import { aPng, ajustar, AMBER, BG, DIM, H, INK, lienzoHistoria, MONO, renglones, SANS, SURF, W } from './shareImage'

/**
 * Imágenes de los informes en formato historia (1080 × 1920). Todo el
 * contenido va entre y≈260 e y≈1580: arriba y abajo Instagram y WhatsApp ponen
 * su barra y su caja de respuesta.
 */

const M = 90
const ARRIBA = 260
const ABAJO = 1580
const CORAL = '#E8634A'
const VERDE = '#34D399'
const ROJO = '#f87171'
const MUTE = '#7C8396'

export type TonoCambio = 'sube' | 'baja' | 'igual'
const colorTono = (t: TonoCambio) => (t === 'sube' ? VERDE : t === 'baja' ? ROJO : MUTE)

function fondo(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = CORAL
  ctx.fillRect(0, 0, W, 14)
}

function marca(ctx: CanvasRenderingContext2D, texto: string) {
  ctx.textAlign = 'left'
  ctx.fillStyle = DIM
  ctx.font = `700 30px ${SANS}`
  ctx.fillText(texto, M, ABAJO)
}

export interface DatosImagenCiclo {
  titulo: string
  subtitulo: string
  cifras: { valor: string; etiqueta: string; record?: boolean }[]
  semanas: { n: number; sesiones: number; planificadas: number; series: number }[]
  filas: { nombre: string; detalle: string; pct: string; tono: TonoCambio }[]
}

export async function generarImagenCiclo(d: DatosImagenCiclo): Promise<Blob> {
  const { canvas, ctx } = await lienzoHistoria()
  fondo(ctx)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = DIM
  ctx.font = `700 30px ${SANS}`
  ctx.fillText('INFORME DEL CICLO', M, ARRIBA + 40)
  ctx.fillStyle = INK
  ctx.font = `800 76px ${SANS}`
  ctx.fillText(ajustar(ctx, d.titulo, W - 2 * M), M, ARRIBA + 130)
  ctx.fillStyle = DIM
  ctx.font = `500 34px ${SANS}`
  ctx.fillText(ajustar(ctx, d.subtitulo, W - 2 * M), M, ARRIBA + 186)

  // Cifras: tres cajas.
  const top = ARRIBA + 236
  const gap = 24
  const colW = (W - 2 * M - gap * 2) / 3
  d.cifras.slice(0, 3).forEach((c, i) => {
    const x = M + i * (colW + gap)
    ctx.fillStyle = SURF
    ctx.beginPath()
    ctx.roundRect(x, top, colW, 160, 28)
    ctx.fill()
    ctx.fillStyle = c.record ? AMBER : INK
    ctx.font = `700 60px ${MONO}`
    ctx.fillText(ajustar(ctx, c.valor, colW - 50), x + 28, top + 84)
    ctx.fillStyle = DIM
    ctx.font = `500 28px ${SANS}`
    ctx.fillText(ajustar(ctx, c.etiqueta, colW - 50), x + 28, top + 132)
  })

  // Semanas: barras por series, con el cambio de bloque marcado.
  const baseY = top + 400
  const altoMax = 150
  const maxSeries = Math.max(1, ...d.semanas.map((s) => s.series))
  const colS = (W - 2 * M - 40) / 6
  ctx.textAlign = 'center'
  d.semanas.forEach((s, i) => {
    const x = M + i * colS + (i >= 3 ? 40 : 0)
    const alto = Math.max(6, (s.series / maxSeries) * altoMax)
    const cumplida = s.planificadas > 0 && s.sesiones >= s.planificadas
    ctx.fillStyle = s.series === 0 ? '#1C1F2A' : cumplida ? VERDE : '#3B3F4E'
    ctx.beginPath()
    ctx.roundRect(x + 14, baseY - alto, colS - 28, alto, 12)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.font = `700 30px ${MONO}`
    ctx.fillText(s.planificadas > 0 ? `${s.sesiones}/${s.planificadas}` : String(s.sesiones), x + colS / 2, baseY + 48)
    ctx.fillStyle = DIM
    ctx.font = `600 26px ${SANS}`
    ctx.fillText(`S${s.n}`, x + colS / 2, baseY + 88)
  })
  ctx.fillStyle = MUTE
  ctx.fillRect(M + 3 * colS + 19, baseY - altoMax - 10, 2, altoMax + 110)
  ctx.font = `600 24px ${SANS}`
  ctx.fillText('cambio de bloque', M + 3 * colS + 20, baseY - altoMax - 24)
  ctx.textAlign = 'left'

  // Ejercicios.
  let y = baseY + 180
  for (const f of d.filas.slice(0, 4)) {
    if (y > ABAJO - 120) break
    ctx.fillStyle = INK
    ctx.font = `600 36px ${SANS}`
    ctx.fillText(ajustar(ctx, f.nombre, W - 2 * M - 200), M, y)
    ctx.fillStyle = DIM
    ctx.font = `500 30px ${MONO}`
    ctx.fillText(ajustar(ctx, f.detalle, W - 2 * M - 200), M, y + 42)
    ctx.fillStyle = colorTono(f.tono)
    ctx.font = `700 40px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(f.pct, W - M, y + 20)
    ctx.textAlign = 'left'
    y += 124
  }

  marca(ctx, 'GymPro')
  return aPng(canvas)
}

/** Fuente más grande con la que `texto` entra en `ancho`. */
function tamanoQueEntra(ctx: CanvasRenderingContext2D, texto: string, ancho: number, familia: string, peso: number, max: number, min: number): number {
  for (let t = max; t > min; t -= 8) {
    ctx.font = `${peso} ${t}px ${familia}`
    if (ctx.measureText(texto).width <= ancho) return t
  }
  return min
}

export async function generarImagenTarjeta(t: TarjetaAnio, pie: string): Promise<Blob> {
  const { canvas, ctx } = await lienzoHistoria()
  fondo(ctx)
  ctx.textBaseline = 'alphabetic'
  const ancho = W - 2 * M

  ctx.fillStyle = DIM
  ctx.font = `700 34px ${SANS}`
  ctx.fillText(t.eyebrow.toUpperCase(), M, ARRIBA + 90)

  // La cifra grande: mono para números, sans para palabras.
  const esNumero = /^[−+\-\d.,]+$/.test(t.grande)
  const familia = esNumero ? MONO : SANS
  const tam = tamanoQueEntra(ctx, t.grande, ancho, familia, 800, esNumero ? 260 : 150, 64)
  ctx.font = `800 ${tam}px ${familia}`
  ctx.fillStyle = t.tono === 'record' ? AMBER : INK
  let y = ARRIBA + 120 + tam
  ctx.fillText(t.grande, M, y)
  if (t.unidad) {
    ctx.fillStyle = DIM
    ctx.font = `600 54px ${SANS}`
    y += 80
    ctx.fillText(ajustar(ctx, t.unidad, ancho), M, y)
  }

  ctx.fillStyle = INK
  ctx.font = `600 52px ${SANS}`
  y += 70
  for (const r of renglones(ctx, t.frase, ancho).slice(0, 4)) {
    y += 68
    ctx.fillText(r, M, y)
  }

  y += 40
  if (t.lista) {
    for (const f of t.lista.slice(0, 3)) {
      if (y > ABAJO - 160) break
      y += 30
      ctx.fillStyle = SURF
      ctx.beginPath()
      ctx.roundRect(M, y, ancho, 120, 24)
      ctx.fill()
      ctx.fillStyle = INK
      ctx.font = `600 36px ${SANS}`
      ctx.fillText(ajustar(ctx, f.nombre, ancho - 60), M + 30, y + 52)
      ctx.fillStyle = AMBER
      ctx.font = `600 32px ${MONO}`
      ctx.fillText(ajustar(ctx, f.valor, ancho - 60), M + 30, y + 98)
      y += 120
    }
  }
  ctx.font = `500 38px ${SANS}`
  for (const d of t.detalles) {
    for (const r of renglones(ctx, d, ancho)) {
      if (y > ABAJO - 110) break
      y += 56
      ctx.fillStyle = DIM
      ctx.fillText(r, M, y)
    }
    y += 12
  }

  marca(ctx, pie)
  return aPng(canvas)
}
