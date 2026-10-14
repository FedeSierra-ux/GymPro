import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { R, S, T } from '../theme'
import { useHoy } from '../utils/useHoy'
import { wrappedDisponible } from '../utils/yearReview'

/**
 * Del 1 de diciembre al 15 de enero, "Tu año en el gym" listo para ver. La
 * cruz lo esconde para ese año.
 */
export function WrappedCard() {
  const { workouts, inicioUso, wrappedCerrado, cerrarWrapped, abrirInforme } = useStore()
  const nowTs = useHoy()
  const year = useMemo(() => wrappedDisponible({ workouts, inicioUso, nowTs }), [workouts, inicioUso, nowTs])
  if (year == null || wrappedCerrado === year) return null

  return (
    <div style={{ padding: '12px 22px 0' }}>
      <section
        aria-label={`Tu ${year} en el gym`}
        style={{
          borderRadius: R.lg, border: `1px solid ${S.line2}`, padding: '12px 6px 14px 14px',
          background: `radial-gradient(120% 90% at 0% 0%, rgba(232,99,74,0.18), transparent 70%), ${S.surf}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Ya está listo</div>
            <div style={{ fontSize: T.title, fontWeight: 700, color: S.ink, marginTop: 2 }}>
              Tu <span className="num">{year}</span> en el gym
            </div>
            <div style={{ fontSize: T.caption, color: S.dim, marginTop: 2 }}>Entrenos, récords y rachas del año, en tarjetas.</div>
          </div>
          <button
            onClick={() => cerrarWrapped(year)}
            aria-label={`Cerrar tu ${year} en el gym`}
            style={{ width: 36, height: 36, background: 'none', border: 'none', color: S.dim, fontSize: T.bodyLg, cursor: 'pointer', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
        <button
          className="btn-primary"
          onClick={() => abrirInforme({ tipo: 'anio', year })}
          style={{ marginTop: 10, marginRight: 8, width: 'calc(100% - 8px)' }}
        >
          Ver mi año
        </button>
      </section>
    </div>
  )
}
