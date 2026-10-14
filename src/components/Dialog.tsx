import type { HTMLAttributes, ReactNode } from 'react'
import { dialogProps, useDialog } from '../utils/useDialog'

/**
 * El panel de un modal o una hoja: rol de diálogo, foco adentro mientras está
 * abierto y Escape para cerrar. El fondo oscuro sigue siendo del que lo usa.
 */
export function Dialog({
  label, onClose, children, ...rest
}: { label: string; onClose: () => void; children: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'role'>) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div ref={ref} {...dialogProps(label)} {...rest} style={{ outline: 'none', ...rest.style }}>
      {children}
    </div>
  )
}
