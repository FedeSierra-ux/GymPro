import { useEffect, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { useStore } from '../store/useStore'
import { exportBackup, readBackupFile, applyBackup, hasPreviousBackup, restorePreviousBackup } from '../utils/backup'
import { MILE_ROUTINE_IDS } from '../data/mileRoutines'
import { plannedDowSet } from '../utils/trainingDays'
import { S } from '../theme'
import { estadoAlmacenamiento, pedirAlmacenamientoPersistente, type EstadoAlmacenamiento } from '../utils/persistentStorage'

/** Si el navegador puede borrar los datos por su cuenta o no. */
function EstadoProteccion() {
  const [estado, setEstado] = useState<EstadoAlmacenamiento | null>(null)
  useEffect(() => { void estadoAlmacenamiento().then(setEstado) }, [])
  if (estado === null || estado === 'no-soportado') return null
  const ok = estado === 'protegido'
  return (
    <div
      className="mb-3 rounded-xl px-3 py-2.5 flex items-start gap-2"
      style={{ background: ok ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }}
    >
      <span aria-hidden="true">{ok ? '🔒' : '⚠️'}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold" style={{ color: ok ? S.good : S.bad }}>
          {ok ? 'Datos protegidos' : 'Datos sin proteger'}
        </p>
        <p className="text-micro text-dim mt-0.5">
          {ok
            ? 'El navegador no los va a borrar por su cuenta. Igual conviene exportar de vez en cuando.'
            : 'El navegador podría borrarlos si le falta espacio. Instalá la app en la pantalla de inicio y exportá un backup.'}
        </p>
        {!ok && (
          <button
            onClick={() => { void pedirAlmacenamientoPersistente().then(setEstado) }}
            className="mt-2 text-xs font-semibold underline"
            style={{ color: S.ink, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Pedir protección de nuevo
          </button>
        )}
      </div>
    </div>
  )
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const {
    anthropicApiKey, setAnthropicApiKey, userName, updateUserName, addToast,
    routines, installMileRoutines, weekPlan, weeklyGoal, setWeeklyGoal, markBackupDone,
    programa, retomarPrograma,
  } = useStore()
  const [hayCopiaPrevia] = useState(hasPreviousBackup)
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false)
  const [key, setKey] = useState(anthropicApiKey ?? '')
  const [name, setName] = useState(userName)
  const [saved, setSaved] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [exportando, setExportando] = useState(false)

  const handleSave = () => {
    setAnthropicApiKey(key.trim())
    updateUserName(name.trim() || 'Atleta')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    if (exportando) return
    setExportando(true)
    try {
      const resultado = await exportBackup()
      if (resultado !== 'cancelado') markBackupDone()
      if (resultado === 'compartido') addToast('Backup listo: guardalo donde quieras', 'success')
      else if (resultado === 'descargado') addToast('Backup descargado', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'No se pudo exportar el backup', 'info')
    } finally {
      setExportando(false)
    }
  }

  // El plan de Mile se instala una sola vez: vive acá y no en Mis Rutinas,
  // que es una pantalla de uso diario.
  const mileFaltantes = MILE_ROUTINE_IDS.filter(id => !routines.some(r => r.id === id)).length
  const diasDelPlan = plannedDowSet(weekPlan, routines.map(r => r.id)).size

  const handleInstallMile = () => {
    const n = installMileRoutines()
    if (n === 0) addToast('Ya tenías todas las rutinas del plan', 'info')
    else addToast(n === 1 ? 'Se agregó 1 rutina del plan' : `Se agregaron ${n} rutinas del plan`, 'success')
  }

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return
    try {
      const backup = await readBackupFile(pendingImportFile)
      applyBackup(backup)
      window.location.reload()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'No se pudo importar el backup', 'info')
    } finally {
      setPendingImportFile(null)
    }
  }

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col screen-enter" style={{ background: 'var(--bg)' }}>
      <div className="flex-shrink-0 px-4 safe-top pb-4 border-b border-border flex items-center gap-3">
        <button onClick={onClose} aria-label="Volver" className="text-dim text-2xl leading-none">‹</button>
        <h1 className="text-lg font-bold text-ink">Ajustes</h1>
      </div>

      <div className="flex-1 min-h-0 scroll-area px-4 py-4 flex flex-col gap-5">
        {/* Nombre */}
        <div>
          <p className="section-label mb-2">Tu nombre</p>
          <input
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-primary text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        {/* Meta semanal */}
        <div>
          <p className="section-label mb-2">Tu meta</p>
          <p className="text-xs text-dim mb-3">
            Cuántos días por semana te proponés entrenar. Es contra esto que Inicio mide la semana.
          </p>
          <div className="flex gap-2">
            {[null, 2, 3, 4, 5, 6].map((n) => {
              const activo = weeklyGoal === n
              const auto = n === null
              return (
                <button
                  key={String(n)}
                  onClick={() => setWeeklyGoal(n)}
                  className="flex-1 rounded-xl text-sm font-bold"
                  style={{
                    minHeight: 48,
                    border: `1px solid ${activo ? 'rgba(232,99,74,0.5)' : 'rgba(236,238,244,0.12)'}`,
                    background: activo ? 'rgba(232,99,74,0.12)' : S.surf,
                    color: activo ? S.acc : S.dim,
                  }}
                >
                  {auto ? 'Auto' : n}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-mute mt-2">
            {weeklyGoal === null
              ? diasDelPlan > 0
                ? `Auto: ${diasDelPlan} por semana, los días que cargaste en tu semana tipo.`
                : 'Auto: 3 por semana hasta que armes tu semana tipo en Agenda.'
              : `${weeklyGoal} entrenos por semana.`}
          </p>
        </div>

        {/* Anthropic API Key */}
        <div>
          <p className="section-label mb-2">API Key de Anthropic</p>
          <p className="text-xs text-dim mb-3">
            Necesaria para las sugerencias de IA personalizadas. Se guarda solo en tu dispositivo.{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Conseguí tu key en console.anthropic.com
            </a>
          </p>
          <input
            type="password"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-primary text-sm font-mono"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          {key && (
            <p className="text-xs text-primary mt-1.5">
              {key.startsWith('sk-ant-') ? '✓ Formato correcto' : '⚠ Debería empezar con sk-ant-'}
            </p>
          )}
        </div>

        {/* Info sobre qué hace la IA */}
        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink mb-2">¿Para qué usa la IA?</p>
          <ul className="flex flex-col gap-1.5">
            {[
              'Analiza tu progreso al terminar un entreno y te da un consejo personalizado',
              'Sugiere qué ejercicio agregar a una rutina para balancearla mejor',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-dim">
                <span className="text-primary flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
          {!key && (
            <p className="text-xs text-mute mt-3 pt-3 border-t border-border">
              Sin API key, la app usa sugerencias algorítmicas basadas en tu historial.
            </p>
          )}
        </div>

        {/* Plan de Mile */}
        <div>
          <p className="section-label mb-2">Plan de Mile</p>
          <p className="text-xs text-dim mb-3">
            Las 3 rutinas del plan (piernas, brazos y full body) con su semana tipo. Se cargan una sola vez; si ya las
            tenés, no se duplican.
          </p>
          <button
            onClick={handleInstallMile}
            disabled={mileFaltantes === 0}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{
              border: `1px solid ${mileFaltantes === 0 ? S.line2 : 'rgba(232,99,74,0.35)'}`,
              background: mileFaltantes === 0 ? S.surf : 'rgba(232,99,74,0.10)',
              color: mileFaltantes === 0 ? S.dim : S.acc,
            }}
          >
            {mileFaltantes === 0
              ? '✓ El plan ya está cargado'
              : `📋 Cargar plan de Mile (${mileFaltantes} rutina${mileFaltantes === 1 ? '' : 's'})`}
          </button>
          {programa?.terminado && (
            <button
              onClick={() => { retomarPrograma(); addToast('En Inicio elegí en qué semana del plan estás', 'info') }}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-border text-ink bg-surface mt-2"
            >
              Retomar el plan por semanas
            </button>
          )}
        </div>

        {/* Backup */}
        <div>
          <p className="section-label mb-2">Backup de datos</p>
          <p className="text-xs text-dim mb-3">
            Tus rutinas, entrenos y récords viven solo en este dispositivo. Si vas a reinstalar la app o cambiar de
            celular, exportá un backup antes para no perderlos.
          </p>
          <EstadoProteccion />
          <p className="text-xs text-mute mb-3">
            En iPhone, Safari borra los datos de un sitio que no usás en ~7 días. Agregando la app a la pantalla de
            inicio (Compartir → Agregar a inicio) eso no pasa, pero igual conviene exportar de vez en cuando.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exportando}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-ink bg-surface"
            >
              {exportando ? '⏳ Preparando...' : '⬇️ Exportar'}
            </button>
            {/*
              El input va adentro de un <label>: abrir el selector con un
              .click() sobre un input display:none no funciona en varias
              WebViews de Android, y así lo dispara el navegador solo.
              El accept incluye la extensión y los MIME que usan los
              administradores de archivos, porque con "application/json" a secas
              el .json aparecía en gris y no se podía elegir.
            */}
            <label
              htmlFor="import-backup"
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-ink bg-surface flex items-center justify-center cursor-pointer"
            >
              ⬆️ Importar
              <input
                id="import-backup"
                type="file"
                accept=".json,application/json,application/octet-stream,text/plain"
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPendingImportFile(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {hayCopiaPrevia && (
            <button
              onClick={() => setConfirmarRestaurar(true)}
              className="w-full mt-2 py-3 rounded-xl text-sm font-semibold border border-border bg-surface"
              style={{ color: 'var(--dim)' }}
            >
              ↩️ Volver a los datos de antes del último import
            </button>
          )}
        </div>

        {/* Créditos — las ilustraciones son CC BY-SA 4.0 y piden atribución. */}
        <div>
          <p className="section-label mb-2">Créditos</p>
          <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-xs text-dim">
              Ilustraciones de los ejercicios:{' '}
              <a href="https://bryllim.github.io/workout-guide/" target="_blank" rel="noreferrer" className="text-primary">
                Workout Guide
              </a>{' '}
              de Bryl Lim, bajo{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="text-primary">
                CC BY-SA 4.0
              </a>
              . Parte de los dibujos derivan de{' '}
              <a href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer" className="text-primary">
                Everkinetic
              </a>{' '}
              (CC BY-SA 4.0).
            </p>
            <p className="text-xs text-dim">
              Figuras de los músculos:{' '}
              <a href="https://github.com/HichamELBSI/react-native-body-highlighter" target="_blank" rel="noreferrer" className="text-primary">
                react-native-body-highlighter
              </a>{' '}
              (licencia MIT), recortadas y encuadradas para cada grupo.
            </p>
            <p className="text-xs text-mute">
              Cambios respecto del original: se redimensionaron a 256 px y se recomprimieron para que la app funcione
              sin conexión.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            saved ? 'bg-primary/20 text-primary border border-primary/30' : 'btn-primary'
          }`}
        >
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      {confirmarRestaurar && (
        <div role="dialog" aria-modal="true" aria-labelledby="restaurar-titulo" className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <Dialog label="Volver a los datos anteriores" onClose={() => setConfirmarRestaurar(false)} className="rounded-2xl p-6 w-full" style={{ background: S.surf, border: '1px solid rgba(255,255,255,0.12)', maxWidth: 340 }}>
            <h3 id="restaurar-titulo" className="font-bold text-ink text-lg mb-2">¿Volver a los datos anteriores?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Se descarta lo importado y vuelven los datos que tenías justo antes del último import.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarRestaurar(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', background: 'none' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { if (restorePreviousBackup()) window.location.reload() }}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: 'none', background: 'rgba(248,113,113,0.15)', color: S.bad }}
              >
                Volver atrás
              </button>
            </div>
          </Dialog>
        </div>
      )}

      {pendingImportFile && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <Dialog label="Importar backup" onClose={() => setPendingImportFile(null)} className="rounded-2xl p-6 w-full" style={{ background: S.surf, border: '1px solid rgba(255,255,255,0.12)', maxWidth: 340 }}>
            <h3 className="font-bold text-ink text-lg mb-2">¿Importar este backup?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Esto reemplaza <strong className="text-ink">todos</strong> tus datos actuales (rutinas, entrenos, récords) por los del archivo. Se guarda una copia de lo que tenés ahora para poder volver atrás desde acá.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingImportFile(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', background: 'none' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: 'none', background: 'rgba(248,113,113,0.15)', color: S.bad }}
              >
                Reemplazar datos
              </button>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  )
}
