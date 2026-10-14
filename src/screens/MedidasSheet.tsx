import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Sparkline } from '../components/Sparkline'
import { toDateInputValue, fromDateInputValue } from '../utils/dates'
import { decimalInputProps, parseDecimal, clampDecimalInput } from '../utils/numberInput'
import { S } from '../theme'
import type { BodyMeasure, MedidaKey } from '../types'

/** Qué se puede anotar, con su unidad y su tope razonable. */
const CAMPOS: { key: MedidaKey; label: string; unidad: string; max: number }[] = [
  { key: 'weightKg', label: 'Peso', unidad: 'kg', max: 300 },
  { key: 'cintura', label: 'Cintura', unidad: 'cm', max: 250 },
  { key: 'pecho', label: 'Pecho', unidad: 'cm', max: 250 },
  { key: 'brazo', label: 'Brazo', unidad: 'cm', max: 100 },
  { key: 'pierna', label: 'Pierna', unidad: 'cm', max: 150 },
  { key: 'cadera', label: 'Cadera', unidad: 'cm', max: 250 },
]

type Borrador = Partial<Record<MedidaKey, string>> & { fecha: string }

/**
 * Peso corporal y circunferencias.
 *
 * Es la curva más simple y la que más se mira, y era lo único que la app no
 * seguía teniendo ya calendario, gráficos y récords. Además le da sentido a los
 * ejercicios a peso corporal: si subís de peso y hacés las mismas dominadas,
 * estás más fuerte.
 */
export function MedidasSheet({ onClose }: { onClose: () => void }) {
  const { measures, addMeasure, deleteMeasure, addUndoToast, addToast } = useStore()
  const [hoy] = useState(() => toDateInputValue(Date.now()))
  const [cargando, setCargando] = useState(false)
  const [borrador, setBorrador] = useState<Borrador>({ fecha: hoy })
  const [verCampo, setVerCampo] = useState<MedidaKey>('weightKg')

  const ordenadas = useMemo(() => [...measures].sort((a, b) => a.date - b.date), [measures])
  const serie = useMemo(
    () => ordenadas.filter((m) => typeof m[verCampo] === 'number').map((m) => ({ date: m.date, value: m[verCampo] as number })),
    [ordenadas, verCampo]
  )

  const campo = CAMPOS.find((c) => c.key === verCampo)!
  const ultimo = serie[serie.length - 1]
  const primero = serie[0]
  const delta = ultimo && primero ? Math.round((ultimo.value - primero.value) * 10) / 10 : 0

  const setValor = (key: MedidaKey, valor: string, max: number) =>
    setBorrador((b) => ({ ...b, [key]: clampDecimalInput(valor, max) }))

  const guardar = () => {
    const nueva: Omit<BodyMeasure, 'id'> = { date: fromDateInputValue(borrador.fecha) ?? Date.now() }
    let algo = false
    for (const c of CAMPOS) {
      const v = parseDecimal(borrador[c.key] ?? '')
      if (!isNaN(v) && v > 0) { nueva[c.key] = v; algo = true }
    }
    if (!algo) {
      addToast('Anotá al menos un valor', 'info')
      return
    }
    addMeasure(nueva)
    setBorrador({ fecha: hoy })
    setCargando(false)
  }

  const borrar = (m: BodyMeasure) => {
    deleteMeasure(m.id)
    addUndoToast(
      `Se borró la medición del ${new Date(m.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
      () => addMeasure(m),
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl px-4 pt-4 flex flex-col sheet-enter"
        style={{ background: S.surf, borderTop: `1px solid ${S.line2}`, height: '88vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: S.surf2, borderRadius: 2, margin: '0 auto 14px', flexShrink: 0 }} />

        <div className="flex items-center justify-between gap-3 flex-shrink-0" style={{ marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 17 }}>Peso y medidas</h3>
          <button
            onClick={onClose} aria-label="Cerrar"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.dim, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
          {/* Curva del campo elegido */}
          <div style={{ background: S.surf2, borderRadius: 16, padding: 16, border: `1px solid ${S.line2}` }}>
            <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, color: S.ink, lineHeight: 1 }}>
                  {ultimo ? ultimo.value.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—'}
                  <span style={{ fontSize: 13, color: S.dim, fontWeight: 500 }}> {campo.unidad}</span>
                </div>
                <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>
                  {ultimo
                    ? `${campo.label} · ${new Date(ultimo.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`
                    : `Todavía no anotaste ${campo.label.toLowerCase()}`}
                </div>
              </div>
              {serie.length > 1 && delta !== 0 && (
                <div style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
                  {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString('es-AR', { maximumFractionDigits: 1 })} {campo.unidad}
                  <div style={{ fontSize: 11, color: S.mute, fontWeight: 500, textAlign: 'right' }}>desde el inicio</div>
                </div>
              )}
            </div>
            {serie.length > 1 ? (
              <div style={{ height: 56 }}>
                <Sparkline values={serie.map((p) => p.value)} color={S.info} height={56} />
              </div>
            ) : (
              <p style={{ fontSize: 11, color: S.mute, padding: '14px 0' }}>
                Con dos mediciones ya se dibuja la curva.
              </p>
            )}
          </div>

          {/* Qué medida se mira */}
          {/* flexShrink 0: dentro de la columna con scroll la fila se achicaba a 2 px. */}
          <div className="flex gap-2" style={{ overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2, flexShrink: 0 }}>
            {CAMPOS.map((c) => {
              const activo = verCampo === c.key
              const tiene = measures.some((m) => typeof m[c.key] === 'number')
              return (
                <button
                  key={c.key}
                  onClick={() => setVerCampo(c.key)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, flexShrink: 0, minHeight: 40, whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: activo ? 'rgba(232,99,74,0.16)' : S.surf2,
                    border: `1px solid ${activo ? S.acc : S.line2}`,
                    color: activo ? S.acc : tiene ? S.dim : S.mute,
                  }}
                >{c.label}</button>
              )
            })}
          </div>

          {/* Anotar una medición */}
          {cargando ? (
            <div style={{ background: S.surf2, borderRadius: 16, padding: 16, border: `1px solid ${S.line2}` }}>
              <label style={{ fontSize: 11, color: S.dim, fontWeight: 600 }}>Fecha</label>
              <input
                type="date" value={borrador.fecha} max={hoy}
                onChange={(e) => setBorrador((b) => ({ ...b, fecha: e.target.value }))}
                aria-label="Fecha de la medición"
                style={{ width: '100%', marginTop: 4, marginBottom: 12, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 12, padding: '12px', fontSize: 15, color: S.ink }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {CAMPOS.map((c) => (
                  <div key={c.key}>
                    <label style={{ fontSize: 11, color: S.dim, fontWeight: 600 }}>{c.label} ({c.unidad})</label>
                    <input
                      {...decimalInputProps}
                      value={borrador[c.key] ?? ''}
                      onChange={(e) => setValor(c.key, e.target.value, c.max)}
                      placeholder="—"
                      aria-label={`${c.label} en ${c.unidad}`}
                      style={{ width: '100%', minWidth: 0, marginTop: 4, background: S.surf, border: `1px solid ${S.line2}`, borderRadius: 12, padding: '12px 10px', fontSize: 15, color: S.ink, textAlign: 'center' }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2" style={{ marginTop: 14 }}>
                <button
                  onClick={() => { setCargando(false); setBorrador({ fecha: hoy }) }}
                  style={{ flex: 1, minHeight: 48, borderRadius: 12, background: 'none', border: `1px solid ${S.line2}`, color: S.dim, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >Cancelar</button>
                <button
                  onClick={guardar}
                  style={{ flex: 1.4, minHeight: 48, borderRadius: 12, background: S.acc, border: 'none', color: S.onAcc, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >Guardar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCargando(true)}
              style={{ width: '100%', minHeight: 52, borderRadius: 12, background: S.acc, border: 'none', color: S.onAcc, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              + Anotar una medición
            </button>
          )}

          {/* Historial */}
          {ordenadas.length > 0 && (
            <div className="flex flex-col gap-2" style={{ paddingBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: S.dim, marginTop: 4 }}>Historial</p>
              {[...ordenadas].reverse().map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3"
                  style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 12, padding: '10px 12px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.ink }}>
                      {new Date(m.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: S.dim, marginTop: 2 }}>
                      {CAMPOS.filter((c) => typeof m[c.key] === 'number')
                        .map((c) => `${c.label} ${m[c.key]} ${c.unidad}`)
                        .join(' · ')}
                    </div>
                  </div>
                  <button
                    onClick={() => borrar(m)}
                    aria-label="Borrar esta medición"
                    style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: S.dim, fontSize: 15, cursor: 'pointer' }}
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
