import { useMemo } from 'react'
import { useAllExercises, useStore } from '../store/useStore'
import { R, S, T } from '../theme'
import { claveMes, MESES, mesDeLaTarjeta } from '../utils/informes'
import { rangoMes, resumenPeriodo } from '../utils/periodSummary'
import { useHoy } from '../utils/useHoy'

/**
 * Del 1 al 7 de cada mes, cómo fue el mes pasado. "Ver" abre Progreso →
 * Resumen en ese mes; la cruz la esconde hasta el mes que viene.
 */
export function ResumenMesCard() {
  const { workouts, prs, resumenMesCerrado, cerrarResumenMes, abrirResumenMes } = useStore()
  const exercises = useAllExercises()
  const nowTs = useHoy()
  const mes = mesDeLaTarjeta(nowTs)
  const clave = mes ? claveMes(mes.year, mes.month) : null
  const resumen = useMemo(() => {
    if (!clave) return null
    const [y, m] = clave.split('-').map(Number)
    return resumenPeriodo({ workouts, exercises, prs, ...rangoMes(y, m - 1) })
  }, [workouts, exercises, prs, clave])
  if (!mes || !clave || !resumen || resumen.sesiones === 0 || resumenMesCerrado === clave) return null
  const nombre = MESES[mes.month]
  const records = resumen.records.length

  return (
    <div style={{ padding: '12px 22px 0' }}>
      <section
        aria-label={`Resumen de ${nombre}`}
        style={{ background: S.surf, borderRadius: R.lg, border: `1px solid ${S.line2}`, padding: '10px 6px 12px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: T.body, fontWeight: 700, color: S.ink }}>Tu {nombre}</span>
          <button
            onClick={() => cerrarResumenMes(clave)}
            aria-label={`Cerrar el resumen de ${nombre}`}
            style={{ width: 36, height: 36, background: 'none', border: 'none', color: S.dim, fontSize: T.bodyLg, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: T.caption, color: S.dim, display: 'flex', flexWrap: 'wrap', columnGap: 14 }}>
            <span><b className="num" style={{ color: S.ink, fontSize: T.bodyLg }}>{resumen.sesiones}</b> {resumen.sesiones === 1 ? 'entreno' : 'entrenos'}</span>
            <span><b className="num" style={{ color: records ? S.acc2 : S.ink, fontSize: T.bodyLg }}>{records}</b> {records === 1 ? 'récord' : 'récords'}</span>
          </span>
          <button
            className="btn-secondary"
            onClick={() => abrirResumenMes(mes.year, mes.month)}
            aria-label={`Ver el resumen de ${nombre}`}
            style={{ padding: '0 16px', fontSize: T.body, flexShrink: 0 }}
          >
            Ver
          </button>
        </div>
      </section>
    </div>
  )
}
