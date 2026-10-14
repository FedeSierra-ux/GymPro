import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportRawBackup, hasPreviousBackup, restorePreviousBackup } from '../utils/backup'

interface State {
  error: Error | null
  mensaje: string | null
}

/**
 * Si algo revienta al dibujar, en vez de la pantalla en blanco (React desmonta
 * todo) queda una salida: exportar los datos tal como están guardados, volver
 * a la copia de antes del último import o reintentar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, mensaje: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GymPro no pudo dibujar la pantalla', error, info.componentStack)
  }

  private exportar = async () => {
    try {
      const r = await exportRawBackup()
      if (r !== 'cancelado') this.setState({ mensaje: 'Listo: guardá el archivo en un lugar seguro.' })
    } catch (e) {
      this.setState({ mensaje: e instanceof Error ? e.message : 'No se pudo exportar' })
    }
  }

  private restaurar = () => {
    if (restorePreviousBackup()) window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    const boton = {
      width: '100%', minHeight: 48, borderRadius: 12, fontSize: 15, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit',
    } as const
    return (
      <div role="alert" style={{
        minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
        padding: '40px 24px', background: 'var(--bg)', color: 'var(--ink)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Algo salió mal</h1>
        <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.5 }}>
          La app no pudo abrir esta pantalla. Tus datos siguen guardados en el teléfono: antes de cualquier
          otra cosa, exportalos.
        </p>
        <button onClick={this.exportar} style={{ ...boton, background: 'var(--acc)', color: '#0C0E14', border: 'none' }}>
          Exportar mis datos
        </button>
        {hasPreviousBackup() && (
          <button onClick={this.restaurar} style={{ ...boton, background: 'var(--surf2)', color: 'var(--ink)', border: '1px solid var(--line2)' }}>
            Volver a los datos de antes del último import
          </button>
        )}
        <button onClick={() => window.location.reload()} style={{ ...boton, background: 'none', color: 'var(--dim)', border: '1px solid var(--line2)' }}>
          Reintentar
        </button>
        {this.state.mensaje && <p style={{ fontSize: 13, color: 'var(--dim)' }}>{this.state.mensaje}</p>}
      </div>
    )
  }
}
