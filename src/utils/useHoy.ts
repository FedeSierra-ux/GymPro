import { useEffect, useState } from 'react'

/**
 * "Ahora", para las pantallas que dependen del día. Antes cada una lo congelaba
 * al montarse (`useState(() => Date.now())`), y una PWA que vuelve del segundo
 * plano no se vuelve a montar: el lunes Inicio seguía mostrando el viernes.
 * Esto se actualiza al volver a la app y al pasar la medianoche.
 */
export function useHoy(): number {
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const actualizar = () => {
      if (document.visibilityState === 'visible') setNowTs(Date.now())
    }
    const hoy = new Date(nowTs)
    const medianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 0, 0, 1).getTime()
    // Los timers se congelan con la pantalla bloqueada; visibilitychange cubre ese caso.
    const timer = setTimeout(() => setNowTs(Date.now()), Math.max(1000, medianoche - Date.now()))
    document.addEventListener('visibilitychange', actualizar)
    window.addEventListener('focus', actualizar)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', actualizar)
      window.removeEventListener('focus', actualizar)
    }
  }, [nowTs])

  return nowTs
}
