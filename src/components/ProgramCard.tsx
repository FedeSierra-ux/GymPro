import { useEffect, useState } from 'react'
import { useHoy } from '../utils/useHoy'
import { useStore } from '../store/useStore'
import { tieneVariante, VARIANTE_LABEL } from '../utils/routineVariant'
import { SEMANAS_PROGRAMA, SEMANA_CAMBIO, semanaDelPrograma } from '../utils/program'

const fechaCorta = (ts: number) => new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

/**
 * En qué semana del plan estás. En la semana 4 las rutinas pasan solas a
 * Semanas 4-6; pasada la 6 pregunta si arrancás de nuevo.
 */
export function ProgramCard() {
  const { routines, programa, fijarSemanaPrograma, sincronizarPrograma, terminarPrograma } = useStore()
  const nowTs = useHoy()
  const [eligiendo, setEligiendo] = useState(false)

  useEffect(() => { sincronizarPrograma() }, [sincronizarPrograma])

  if (!routines.some(tieneVariante) || programa?.terminado) return null

  // El domingo la tarjeta ya habla de la semana que arranca mañana: es el día
  // en que uno se organiza, y la semana que se elige ese día es la que viene.
  const arrancaManana = programa != null && new Date(nowTs).getDay() === 0
  const semana = programa ? semanaDelPrograma(programa.inicio, arrancaManana ? nowTs + 86400000 : nowTs) : null
  const terminado = semana != null && semana > SEMANAS_PROGRAMA

  const chips = (
    <div role="group" aria-label="Semana del plan" style={{ display: 'grid', gridTemplateColumns: `repeat(${SEMANAS_PROGRAMA}, 1fr)`, gap: 6, marginTop: 10 }}>
      {Array.from({ length: SEMANAS_PROGRAMA }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => { fijarSemanaPrograma(n); setEligiendo(false) }}
          aria-pressed={semana === n}
          className="num"
          style={{
            minHeight: 40, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
            background: semana === n ? 'rgba(232,99,74,0.15)' : 'var(--surf2)',
            border: `1px solid ${semana === n ? 'rgba(232,99,74,0.4)' : 'var(--line2)'}`,
            color: semana === n ? 'var(--acc)' : 'var(--ink)',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )

  const caja = { background: 'var(--surf)', borderRadius: 14, border: '1px solid var(--line2)', padding: '12px 14px' } as const
  const titulo = { fontSize: 13, fontWeight: 700, color: 'var(--ink)' } as const

  if (semana == null) {
    return (
      <div style={{ padding: '12px 22px 0' }}>
        <section aria-label="Semana del plan" style={caja}>
          <div style={titulo}>¿En qué semana del plan estás?</div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
            Con eso, en la semana {SEMANA_CAMBIO} las rutinas pasan solas a {VARIANTE_LABEL.alt}.
          </div>
          {chips}
        </section>
      </div>
    )
  }

  if (terminado) {
    return (
      <div style={{ padding: '12px 22px 0' }}>
        <section aria-label="Plan terminado" style={caja}>
          <div style={titulo}>Terminaste las {SEMANAS_PROGRAMA} semanas del plan</div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>¿Arrancás de nuevo desde la semana 1?</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => fijarSemanaPrograma(1)}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--acc)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Arrancar de nuevo
            </button>
            <button
              onClick={terminarPrograma}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid var(--line2)', background: 'var(--surf2)', color: 'var(--ink)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Terminar el plan
            </button>
          </div>
        </section>
      </div>
    )
  }

  const inicio = new Date(programa!.inicio)
  const cambio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + (SEMANA_CAMBIO - 1) * 7).getTime()
  const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + SEMANAS_PROGRAMA * 7 - 1).getTime()
  const enAlt = semana >= SEMANA_CAMBIO

  return (
    <div style={{ padding: '12px 22px 0' }}>
      <section aria-label={`Semana ${semana} de ${SEMANAS_PROGRAMA} del plan`} style={caja}>
        <button
          onClick={() => setEligiendo((v) => !v)}
          aria-expanded={eligiendo}
          aria-label={`Semana ${semana} de ${SEMANAS_PROGRAMA}. Tocá para corregir la semana`}
          style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={titulo}>Tu plan</span>
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>
              {arrancaManana && 'Desde mañana · '}Semana <b className="num" style={{ color: 'var(--ink)', fontSize: 14 }}>{semana}</b> de <span className="num">{SEMANAS_PROGRAMA}</span>
            </span>
          </div>
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${SEMANAS_PROGRAMA}, 1fr)`, gap: 4, marginTop: 8 }}>
            {Array.from({ length: SEMANAS_PROGRAMA }, (_, i) => (
              <span key={i} style={{
                height: 6, borderRadius: 3,
                background: i + 1 < semana ? 'var(--acc)' : i + 1 === semana ? 'rgba(232,99,74,0.45)' : 'var(--surf2)',
                marginLeft: i === SEMANA_CAMBIO - 1 ? 4 : 0,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
            <span>{enAlt ? VARIANTE_LABEL.alt : VARIANTE_LABEL.base}</span>
            <span>{enAlt ? `termina el ${fechaCorta(fin)}` : `${VARIANTE_LABEL.alt.replace('Semanas ', '')} desde el ${fechaCorta(cambio)}`}</span>
          </div>
        </button>
        {eligiendo && (
          <>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 12 }}>¿En qué semana estás?</div>
            {chips}
          </>
        )}
      </section>
    </div>
  )
}
