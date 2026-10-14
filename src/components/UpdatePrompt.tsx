import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Aviso de "nueva versión disponible". Con registerType: 'prompt', el service
 * worker precachea los assets nuevos en segundo plano y cuando están listos
 * dispara `needRefresh`. Acá mostramos un toast para que el usuario aplique la
 * actualización cuando quiera (recarga la app), en vez de un reload sorpresivo.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Una PWA que nunca se cierra del todo no volvía a buscar versiones nuevas.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => { void registration.update().catch(() => {}) }, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex justify-center px-4 toast-in"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', pointerEvents: 'none' }}
    >
      <div
        role="status"
        className="flex items-center gap-3 w-full max-w-sm rounded-2xl px-4 py-3"
        style={{
          background: 'var(--surf2)',
          border: '1px solid var(--line2)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: 22 }} aria-hidden="true">✨</span>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Nueva versión disponible</p>
          <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>Actualizá para tener las últimas mejoras</p>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Descartar aviso de actualización"
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--dim)', background: 'none',
            border: 'none', padding: '6px 8px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Después
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            fontSize: 12, fontWeight: 700, color: 'var(--on-acc)', background: 'var(--acc)',
            border: 'none', borderRadius: 12, padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
