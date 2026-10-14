import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { S } from '../theme'
import type { AppToast } from '../types'

function ToastItem({ toast }: { toast: AppToast }) {
  const { removeToast } = useStore()

  useEffect(() => {
    // Los avisos con "Deshacer" duran más: hay que llegar a leerlos y decidir.
    const ms = toast.undo ? 6000 : toast.type === 'pr' ? 4000 : 3000
    const t = setTimeout(() => removeToast(toast.id), ms)
    return () => clearTimeout(t)
  }, [toast.id, toast.type, toast.undo, removeToast])

  // Todos sobre la misma superficie: el coral lleno parecía un botón. El tipo
  // lo dice el ícono (verde hecho, ámbar récord).
  const icono = { success: { c: '✓', color: S.good }, pr: { c: '🏆', color: S.acc2 }, info: null }[toast.type]

  return (
    <div
      className="toast-in flex items-center gap-3 rounded-2xl"
      style={{
        background: S.surf2,
        border: `1px solid ${toast.type === 'pr' ? 'rgba(242,169,59,0.45)' : S.line2}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        padding: toast.undo ? '8px 8px 8px 16px' : '12px 16px',
        minHeight: 48,
      }}
      onClick={() => { if (!toast.undo) removeToast(toast.id) }}
    >
      {icono && <span aria-hidden="true" style={{ color: icono.color, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{icono.c}</span>}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: S.ink, lineHeight: 1.35 }}>
        {toast.message}
      </span>
      {toast.undo && (
        <button
          onClick={(e) => { e.stopPropagation(); toast.undo?.(); removeToast(toast.id) }}
          style={{
            flexShrink: 0, minHeight: 40, padding: '0 16px', borderRadius: 12,
            background: 'rgba(232,99,74,0.14)', border: `1px solid ${S.acc}`,
            color: S.acc, fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Deshacer
        </button>
      )}
    </div>
  )
}

/**
 * Los avisos aparecen abajo, encima de la barra de navegación. Cuando hay una
 * pantalla con su propio botón principal abajo (el resumen del entreno, una
 * hoja modal), `arriba` los manda al tope: al terminar un entreno se disparaban
 * tres avisos justo encima de "Ver mi progreso", el único botón para salir, y
 * lo dejaban tapado varios segundos.
 */
export function ToastContainer({ arriba = false }: { arriba?: boolean } = {}) {
  const { toasts } = useStore()
  if (toasts.length === 0) return null

  return (
    <div
      className={`absolute left-0 right-0 flex flex-col items-center gap-2 px-4 z-[100] pointer-events-none ${arriba ? 'top-0 pt-[max(56px,calc(env(safe-area-inset-top,0px)+16px))]' : 'bottom-20'}`}
    >
      {toasts.slice(-3).map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
