import { S } from '../theme'

/**
 * Línea de progreso de un ejercicio: un punto por sesión, con el último
 * marcado. Reemplaza a las barras mensuales, que dejaban cuatro columnas vacías
 * de seis y ocupaban 600 px por ejercicio.
 *
 * El SVG se estira al ancho disponible, así que sólo lleva los trazos (con
 * `non-scaling-stroke`, para que no engorden); los puntos son elementos HTML
 * ubicados en %, y quedan redondos a cualquier ancho. Antes, con
 * preserveAspectRatio="none", el punto final salía como un óvalo.
 */
export function Sparkline({
  values, color = S.acc, puntoColor, width = 240, height = 40, ejes,
}: {
  values: number[]
  color?: string
  /** Color del punto final, si es distinto del de la línea (el del cambio: verde sube, rojo baja). */
  puntoColor?: string
  width?: number
  height?: number
  /**
   * Para el gráfico grande: mínimo y máximo a la izquierda, primera y última
   * fecha abajo, el último valor etiquetado y una guía punteada al nivel de la
   * mejor marca anterior.
   */
  ejes?: { formato: (v: number) => string; desde: string; hasta: string }
}) {
  // Con una sola marca no hay evolución que dibujar: un puntito solo en el
  // medio del gráfico no representa nada y confunde más de lo que aporta.
  if (values.length < 2) return null

  const pad = 4
  const max = Math.max(...values)
  const min = Math.min(...values)
  // Todas iguales: la línea va al medio en vez de al piso.
  const rango = max - min || Math.max(1, max * 0.2)
  const base = max === min ? min - rango / 2 : min

  // Coordenadas en % del área del gráfico (0-100).
  const xp = (i: number) => (i / (values.length - 1)) * 100
  const yp = (v: number) => (1 - (v - base) / rango) * 100
  // El viewBox es el mismo rectángulo en unidades de 100 × alto: lo que se
  // estira es el SVG entero, y con non-scaling-stroke el trazo no se deforma.
  const alto = 100 * (height / width)
  const x = (i: number) => xp(i)
  const y = (v: number) => pad / 2 + (yp(v) / 100) * (alto - pad)

  const linea = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const area = `${linea} L100,${alto} L0,${alto} Z`
  const ultimo = values[values.length - 1]
  const previoMax = Math.max(...values.slice(0, -1))
  const punto = puntoColor ?? color
  const top = (v: number) => `calc(${pad / 2}px + ${(yp(v) / 100).toFixed(4)} * (100% - ${pad}px))`

  const grafico = (
    <div style={{ position: 'relative', width: '100%', height }} aria-hidden="true">
      <svg
        width="100%" height={height} viewBox={`0 0 100 ${alto}`}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path d={area} fill={color} fillOpacity={0.12} stroke="none" />
        {ejes && (
          <line
            x1={0} x2={100} y1={y(previoMax)} y2={y(previoMax)}
            stroke={S.line2} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
          />
        )}
        <path d={linea} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {values.slice(0, -1).map((v, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${xp(i)}%`, top: top(v), width: 4, height: 4, marginLeft: -2, marginTop: -2,
          borderRadius: 2, background: color, opacity: 0.45,
        }} />
      ))}
      <span style={{
        position: 'absolute', left: '100%', top: top(ultimo), width: 12, height: 12, marginLeft: -6, marginTop: -6,
        borderRadius: 6, background: punto, opacity: 0.25,
      }} />
      <span style={{
        position: 'absolute', left: '100%', top: top(ultimo), width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5,
        borderRadius: 4, background: punto,
      }} />
      {/* El último valor, salvo que ya lo diga el eje (es el máximo o el mínimo). */}
      {ejes && ultimo !== max && ultimo !== min && (
        <span className="num" style={{
          position: 'absolute', right: 10, top: top(ultimo), transform: 'translateY(-130%)',
          fontSize: 11, fontWeight: 700, color: S.ink, whiteSpace: 'nowrap',
        }}>
          {ejes.formato(ultimo)}
        </span>
      )}
    </div>
  )

  if (!ejes) return grafico

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', columnGap: 8 }}>
      <div className="num" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height, fontSize: 11, color: S.mute, textAlign: 'right' }}>
        <span>{ejes.formato(max)}</span>
        {max !== min && <span>{ejes.formato(min)}</span>}
      </div>
      {grafico}
      <span />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.mute, marginTop: 4 }}>
        <span>{ejes.desde}</span>
        <span>{ejes.hasta}</span>
      </div>
    </div>
  )
}
