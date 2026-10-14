import { useEffect } from 'react'

/**
 * Mantiene la pantalla encendida mientras dura el entreno (Screen Wake Lock:
 * Chrome/Android desde hace rato y Safari iOS desde 16.4). Sin esto el celular
 * se bloquea entre series y hay que desbloquearlo para cargar cada peso.
 * Si la API no existe, no pasa nada: la función se vuelve un no-op.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let released = false
    // El pedido inicial y el de visibilitychange podían estar en vuelo a la
    // vez: se conseguían dos locks y el cleanup soltaba uno solo.
    let pidiendo = false

    const request = async () => {
      if (released || pidiendo || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return
      pidiendo = true
      try {
        const acquired = await navigator.wakeLock.request('screen')
        // El pedido es asíncrono: si mientras tanto terminó el entreno (o se
        // desmontó el componente), el cleanup ya corrió con sentinel en null.
        // Soltamos acá el lock recién conseguido en vez de guardarlo, o la
        // pantalla se quedaría encendida para siempre.
        if (released) {
          void acquired.release().catch(() => {})
          return
        }
        sentinel = acquired
      } catch {
        // El navegador puede negarlo (batería baja, pestaña en segundo plano).
      } finally {
        pidiendo = false
      }
    }

    // El lock se pierde al minimizar la app: hay que volver a pedirlo al volver.
    const onVisibilityChange = () => { void request() }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
