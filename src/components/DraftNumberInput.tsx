import { useState, type CSSProperties } from 'react'
import { decimalInputProps, integerInputProps, normalizeDecimalInput, normalizeIntegerInput } from '../utils/numberInput'

/**
 * Campo numérico que deja escribir tranquilo y recién acota al salir.
 *
 * Los campos de la rutina corregían el valor en cada tecla: al borrar el 3
 * para escribir un 4 el campo volvía a 1, y quedaba 14. Acá lo que se escribe
 * es un borrador de texto; al salir del campo (o con Enter) se acota a
 * [min, max] y se guarda. Si quedó vacío o inválido, vuelve el valor anterior.
 */
export function DraftNumberInput({
  value, onCommit, min, max, decimal = false, ariaLabel, className, style,
}: {
  value: number
  onCommit: (value: number) => void
  min: number
  max: number
  /** Acepta decimales con coma o punto (minutos de cardio: 1,5). */
  decimal?: boolean
  ariaLabel: string
  className?: string
  style?: CSSProperties
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const mostrado = borrador ?? (decimal ? String(value).replace('.', ',') : String(value))

  const confirmar = () => {
    if (borrador === null) return
    const n = decimal ? parseFloat(normalizeDecimalInput(borrador)) : parseInt(borrador, 10)
    setBorrador(null)
    if (!Number.isFinite(n)) return
    const acotado = Math.min(max, Math.max(min, decimal ? Math.round(n * 10) / 10 : n))
    if (acotado !== value) onCommit(acotado)
  }

  return (
    <input
      {...(decimal ? decimalInputProps : integerInputProps)}
      value={mostrado}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setBorrador(decimal ? e.target.value.replace(/[^0-9.,]/g, '') : normalizeIntegerInput(e.target.value))}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className={className}
      style={style}
    />
  )
}
