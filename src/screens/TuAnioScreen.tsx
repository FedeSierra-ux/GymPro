import { useMemo, useState, type KeyboardEvent } from 'react'
import { Dialog } from '../components/Dialog'
import { useAllExercises, useStore } from '../store/useStore'
import { R, S, T } from '../theme'
import { tarjetasDelAnio, type TarjetaAnio } from '../utils/informes'
import { compartirImagen } from '../utils/shareImage'
import { generarImagenTarjeta } from '../utils/shareInformes'
import { useHoy } from '../utils/useHoy'
import { resumenAnual } from '../utils/yearReview'

/** Una cifra o una palabra: las cifras van en mono y más grandes. */
const esCifra = (t: string) => /^[−+\-\d.,]+$/.test(t)

function Tarjeta({ t }: { t: TarjetaAnio }) {
  const cifra = esCifra(t.grande)
  return (
    <div className="tarjeta-entra" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="eyebrow" style={{ color: S.dim, fontSize: T.caption }}>{t.eyebrow}</div>
      <div
        className={cifra ? 'num' : undefined}
        style={{
          // La cifra del resumen es la excepción a la escala: es lo único que hay en la tarjeta.
          fontSize: cifra ? 'clamp(64px, 24vw, 104px)' : 'clamp(32px, 11vw, 48px)',
          fontWeight: 800, lineHeight: 1.02, letterSpacing: cifra ? '-0.04em' : '-0.02em',
          color: t.tono === 'record' ? S.acc2 : S.ink, marginTop: 6, overflowWrap: 'anywhere',
        }}
      >
        {t.grande}
      </div>
      {t.unidad && <div style={{ fontSize: T.h2, fontWeight: 600, color: S.dim }}>{t.unidad}</div>}
      <p style={{ fontSize: T.h2, fontWeight: 600, color: S.ink, lineHeight: 1.3, marginTop: 14 }}>{t.frase}</p>
      {t.lista && t.lista.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {t.lista.map((f, i) => (
            <li key={i} style={{ background: S.surf, border: `1px solid ${S.line2}`, borderRadius: R.md, padding: '10px 12px' }}>
              <div style={{ fontSize: T.body, fontWeight: 600, color: S.ink }}>{f.nombre}</div>
              <div className="num" style={{ fontSize: T.caption, color: S.acc2, marginTop: 2 }}>{f.valor}</div>
            </li>
          ))}
        </ul>
      )}
      {t.detalles.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {t.detalles.map((d, i) => <li key={i} style={{ fontSize: T.bodyLg, color: S.dim, lineHeight: 1.4 }}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}

/**
 * "Tu año en el gym": tarjetas tipo historia. Tocar a la derecha avanza, el
 * tercio izquierdo vuelve; con teclado, las flechas. Cada tarjeta se puede
 * compartir como imagen.
 */
export function TuAnioScreen({ year, onClose }: { year: number; onClose: () => void }) {
  const { workouts, prs, measures, ciclosPrograma, inicioUso, addToast } = useStore()
  const exercises = useAllExercises()
  const nowTs = useHoy()
  const [idx, setIdx] = useState(0)
  const [compartiendo, setCompartiendo] = useState(false)

  const tarjetas = useMemo(() => {
    const r = resumenAnual({ workouts, exercises, prs, measures, ciclos: ciclosPrograma, inicioUso, year, nowTs })
    const nombres = new Map(exercises.map((e) => [e.id, e.nameEs]))
    if (r.sesiones === 0) {
      return [{ id: 'vacio', eyebrow: 'Tu año en el gym', grande: String(year), frase: `Todavía no hay entrenos terminados en ${year}.`, detalles: [] }] as TarjetaAnio[]
    }
    return tarjetasDelAnio(r, (id) => nombres.get(id) ?? 'Ejercicio borrado')
  }, [workouts, exercises, prs, measures, ciclosPrograma, inicioUso, year, nowTs])

  const actual = tarjetas[Math.min(idx, tarjetas.length - 1)]
  const ultima = idx >= tarjetas.length - 1
  const atras = () => setIdx((i) => Math.max(0, i - 1))
  const adelante = () => setIdx((i) => Math.min(tarjetas.length - 1, i + 1))

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); adelante() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); atras() }
  }

  const compartir = async () => {
    setCompartiendo(true)
    try {
      const blob = await generarImagenTarjeta(actual, `GymPro · Tu ${year}`)
      await compartirImagen(blob, `gympro-${year}-${actual.id}.png`)
    } catch {
      addToast('No se pudo armar la imagen', 'info')
    } finally {
      setCompartiendo(false)
    }
  }

  const fondo = actual.tono === 'record'
    ? `radial-gradient(120% 55% at 0% 0%, rgba(242,169,59,0.20), transparent 65%), ${S.bg}`
    : `radial-gradient(120% 55% at 0% 0%, rgba(232,99,74,0.16), transparent 65%), ${S.bg}`

  return (
    <Dialog
      label={`Tu año en el gym, ${year}`}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: fondo }}
    >
      {/* Barras de progreso y cerrar */}
      <div style={{ flexShrink: 0, padding: 'max(16px, calc(env(safe-area-inset-top, 0px) + 10px)) 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div aria-hidden="true" style={{ flex: 1, display: 'flex', gap: 4 }}>
          {tarjetas.map((t, i) => (
            <span key={t.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= idx ? S.ink : 'rgba(236,238,244,0.22)', transition: 'background 0.2s ease-out' }} />
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar tu año en el gym"
          style={{ width: 44, height: 44, background: 'none', border: 'none', color: S.ink, fontSize: T.title, cursor: 'pointer', flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* La tarjeta: el tercio izquierdo vuelve, el resto avanza. */}
      <div
        onClick={(e) => {
          const caja = e.currentTarget.getBoundingClientRect()
          if (e.clientX - caja.left < caja.width / 3) atras()
          else adelante()
        }}
        className="scroll-area"
        style={{ flex: 1, minHeight: 0, padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'safe center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div aria-live="polite" aria-atomic="true" aria-label={`Tarjeta ${idx + 1} de ${tarjetas.length}`} role="group">
          <Tarjeta key={actual.id} t={actual} />
        </div>
      </div>
      {/* Para lectores de pantalla y teclado (también andan las flechas). */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button className="sr-only focus:not-sr-only btn-secondary" onClick={atras} disabled={idx === 0}>Tarjeta anterior</button>
        <button className="sr-only focus:not-sr-only btn-secondary" onClick={adelante} disabled={ultima}>Tarjeta siguiente</button>
      </div>

      <div style={{ flexShrink: 0, padding: '8px 24px max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, fontSize: T.caption, color: S.mute }}>
          {ultima ? '' : idx === 0 ? 'Tocá para seguir' : <span className="num">{idx + 1}/{tarjetas.length}</span>}
        </span>
        {ultima && (
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0 12px' }}>Cerrar</button>
        )}
        <button className="btn-secondary" onClick={compartir} disabled={compartiendo} style={{ padding: '0 16px' }}>
          {compartiendo ? 'Armando…' : 'Compartir'}
        </button>
      </div>
    </Dialog>
  )
}
