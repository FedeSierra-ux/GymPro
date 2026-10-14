import { useEffect, useRef } from 'react'

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Lo mínimo para que una hoja o un modal sea un diálogo de verdad: el foco
 * entra al abrirlo y vuelve adonde estaba al cerrarlo, Tab no se escapa al
 * contenido de atrás y Escape cierra. Con VoiceOver o TalkBack, sin esto, se
 * seguía navegando la pantalla de abajo (incluso detrás de "¿Cancelar entreno?").
 *
 * Se usa con `{...dialogProps(ref)}` en el contenedor del diálogo.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const cerrar = useRef(onClose)
  useEffect(() => { cerrar.current = onClose })

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const nodo = ref.current
    const primero = nodo?.querySelector<HTMLElement>(ENFOCABLES)
    ;(primero ?? nodo)?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar.current()
        return
      }
      if (e.key !== 'Tab' || !nodo) return
      const lista = Array.from(nodo.querySelectorAll<HTMLElement>(ENFOCABLES))
      if (!lista.length) return
      const [a, z] = [lista[0], lista[lista.length - 1]]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previo?.focus?.({ preventScroll: true })
    }
  }, [])

  return ref
}

/** Atributos de un diálogo modal. */
export function dialogProps(label: string) {
  return { role: 'dialog' as const, 'aria-modal': true, 'aria-label': label, tabIndex: -1 }
}
