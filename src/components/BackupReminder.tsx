import { useState } from 'react'
import { useHoy } from '../utils/useHoy'
import { useStore } from '../store/useStore'
import { S } from '../theme'

/** Cada cuánto se recuerda hacer una copia. */
const DIAS_ENTRE_AVISOS = 14
/** Antes de este piso no vale la pena molestar: no hay casi nada que perder. */
const ENTRENOS_MINIMOS = 5

/**
 * Recordatorio de backup.
 *
 * Todo el historial vive en el localStorage de un solo teléfono: si se cambia
 * de equipo, se reinstala o el sistema limpia los datos del sitio, se pierde
 * todo y no hay vuelta atrás. Exportar funciona, pero hay que acordarse, y
 * nadie se acuerda. Este aviso aparece al final de Inicio cada dos semanas.
 */
export function BackupReminder() {
  const { workouts, lastBackupAt, setActiveTab } = useStore()
  const nowTs = useHoy()
  const [oculto, setOculto] = useState(false)

  const terminados = workouts.filter((w) => w.finishedAt)
  if (oculto || terminados.length < ENTRENOS_MINIMOS) return null

  // Sin backup nunca, se cuenta desde el primer entreno.
  const desde = lastBackupAt ?? Math.min(...terminados.map((w) => w.startedAt))
  const dias = Math.floor((nowTs - desde) / 86400000)
  if (dias < DIAS_ENTRE_AVISOS) return null
  // Sólo los que se hicieron después del último backup: contaba todos.
  const sinCopia = lastBackupAt ? terminados.filter((w) => (w.finishedAt ?? w.startedAt) > lastBackupAt).length : terminados.length
  if (sinCopia === 0) return null

  // Una línea al final de Inicio: está para recordar, no para tapar lo de hoy.
  return (
    <div style={{ padding: '16px 22px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 6px 12px', borderRadius: 12, border: `1px solid ${S.line2}` }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: S.dim }}>
          <span className="num" style={{ color: S.ink }}>{sinCopia}</span> {sinCopia === 1 ? 'entreno' : 'entrenos'} sin copia
          {lastBackupAt ? ` · la última hace ${dias} días` : ''}
        </span>
        <button
          onClick={() => setActiveTab('perfil')}
          style={{
            flexShrink: 0, minHeight: 36, padding: '0 10px', borderRadius: 12,
            background: 'none', border: 'none',
            color: S.acc, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Exportar
        </button>
        <button
          onClick={() => setOculto(true)}
          aria-label="Ocultar el recordatorio"
          style={{
            flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: S.mute, fontSize: 15, cursor: 'pointer',
          }}
        >×</button>
      </div>
    </div>
  )
}
