import { useStore } from '../store/useStore'
import { InformeCicloSheet } from '../screens/InformeCicloSheet'
import { TuAnioScreen } from '../screens/TuAnioScreen'

/**
 * Los informes a pantalla completa, encima de las pestañas. Se abren desde
 * cualquier lado (Inicio, la tarjeta del plan, Progreso) con `abrirInforme`.
 */
export function InformeHost() {
  const informe = useStore((s) => s.informe)
  const cerrar = useStore((s) => s.cerrarInforme)
  if (!informe) return null
  if (informe.tipo === 'ciclo') {
    return <InformeCicloSheet key={informe.inicio} inicio={informe.inicio} fin={informe.fin} onClose={cerrar} />
  }
  return <TuAnioScreen key={informe.year} year={informe.year} onClose={cerrar} />
}
