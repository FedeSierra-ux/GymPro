import { useMemo, useState } from 'react'
import { useStore, useAllExercises } from '../store/useStore'
import { SettingsScreen } from './SettingsScreen'
import { MedidasSheet } from './MedidasSheet'
import { HistorialBuscadorSheet } from './HistorialBuscadorSheet'
import { getWorkoutStreak } from '../utils/streak'
import { seriesEfectivas } from '../utils/volume'
import { formatKg } from '../utils/format'
import { Sparkline } from '../components/Sparkline'
import { S } from '../theme'

/**
 * Achica la foto elegida a 256 px y la devuelve como JPEG en data URL: así
 * entra en el almacenamiento del teléfono (y en la copia de seguridad) sin
 * ocupar varios megas.
 */
function achicarFoto(file: File, lado = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Recorte cuadrado desde el centro.
      const corte = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = lado
      canvas.height = lado
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('sin canvas')); return }
      ctx.drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, lado, lado)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('no se pudo leer la imagen')) }
    img.src = url
  })
}

/** "en 9 días", "en 3 semanas", "en 2 meses" */
function lapso(ms: number): string {
  const dias = Math.max(1, Math.round(ms / 86400000))
  if (dias < 14) return `en ${dias} ${dias === 1 ? 'día' : 'días'}`
  if (dias < 60) return `en ${Math.round(dias / 7)} semanas`
  const meses = Math.round(dias / 30)
  return `en ${meses} ${meses === 1 ? 'mes' : 'meses'}`
}

export function ProfileScreen() {
  const { userName, updateUserName, workouts, prs, measures, avatarPhoto, setAvatarPhoto, addToast } = useStore()
  const allExercises = useAllExercises()

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(userName)
  const [showSettings, setShowSettings] = useState(false)
  const [showMedidas, setShowMedidas] = useState(false)
  const [showBuscador, setShowBuscador] = useState(false)

  const finished = useMemo(() => workouts.filter((w) => w.finishedAt), [workouts])
  const totalWorkouts = finished.length
  const totalMinutes = finished.reduce((a, w) => a + (w.durationMin ?? 0), 0)
  const streak = useMemo(() => getWorkoutStreak(finished), [finished])

  const initials = userName.slice(0, 2).toUpperCase()
  const seriesTotales = useMemo(() => seriesEfectivas(finished), [finished])
  const ultimaMedida = measures.length > 0 ? measures[measures.length - 1] : null
  // Las últimas mediciones de peso, para la línea de la tarjeta.
  const pesos = useMemo(
    () => measures.filter(m => m.weightKg).sort((a, b) => a.date - b.date).slice(-8),
    [measures]
  )
  const difPeso = pesos.length > 1 ? pesos[pesos.length - 1].weightKg! - pesos[0].weightKg! : 0

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setAvatarPhoto(await achicarFoto(file))
    } catch {
      addToast('No se pudo usar esa foto. Probá con otra.', 'info')
    }
  }

  const handleSaveName = () => {
    if (nameDraft.trim()) updateUserName(nameDraft.trim())
    setEditingName(false)
  }

  return (
    <div className="flex-1 min-h-0 scroll-area pb-4">
      <div className="px-4 safe-top pb-6">
        <h1 className="text-2xl font-bold text-ink">Perfil</h1>
      </div>

      {/* Avatar + Name */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border-hi rounded-2xl p-5 flex items-center gap-4">
          {/*
            El input va adentro de un <label>: abrir el selector con un .click()
            sobre un input display:none no funciona en varias WebViews de
            Android (ni siempre en iOS), y así lo dispara el navegador solo.
            Sin `capture`, para que ofrezca galería y cámara.
          */}
          <label
            htmlFor="avatar-foto"
            role="button"
            aria-label={avatarPhoto ? 'Cambiar la foto de perfil' : 'Elegir una foto de perfil'}
            className="w-16 h-16 rounded-2xl bg-primary-muted border border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden relative"
            style={{ padding: 0, cursor: 'pointer' }}
          >
            {avatarPhoto
              ? <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
              : <span className="text-primary text-2xl font-bold">{initials}</span>}
            <span aria-hidden="true" style={{
              position: 'absolute', right: 3, bottom: 3, width: 20, height: 20, borderRadius: 10,
              background: S.surf, border: `1px solid ${S.line2}`, fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>📷</span>
            <input
              id="avatar-foto"
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
              onChange={elegirFoto}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
          </label>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  aria-label="Editar nombre"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  maxLength={24}
                  className="flex-1 bg-surface border border-border-hi rounded-lg px-3 py-1.5 text-ink text-sm focus:border-primary"
                />
                <button
                  onClick={handleSaveName}
                  aria-label="Guardar nombre"
                  className="text-primary text-sm font-bold px-2"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-bold text-ink text-lg">{userName}</p>
                <button
                  onClick={() => { setNameDraft(userName); setEditingName(true) }}
                  aria-label="Editar nombre"
                  className="text-dim transition-colors text-sm"
                >
                  ✏️
                </button>
              </div>
            )}
            {avatarPhoto ? (
              <button onClick={() => setAvatarPhoto(null)} className="text-dim text-xs mt-0.5" style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Quitar la foto
              </button>
            ) : (
              <p className="text-dim text-xs mt-0.5">Tocá el cuadrado para poner una foto</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border-hi rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-ink num">{totalWorkouts}</p>
            <p className="text-micro text-dim mt-0.5">Entrenos</p>
          </div>
          <div className="bg-card border border-border-hi rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-ink num">{Math.round(totalMinutes / 60)}h</p>
            <p className="text-micro text-dim mt-0.5">Horas totales</p>
          </div>
          <div className="bg-card border border-border-hi rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-ink num">{prs.length}</p>
            <p className="text-micro text-dim mt-0.5">Récords</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="bg-card border border-border-hi rounded-xl p-3">
            <p className="text-lg font-bold text-ink num">{seriesTotales.toLocaleString('es-AR')}</p>
            <p className="text-micro text-dim mt-0.5">Series en total</p>
          </div>
          <div className="bg-card border border-border-hi rounded-xl p-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🔥</span>
            <span className="text-lg font-bold text-ink num">{streak.current}</span>
            <span className="text-xs text-dim">
              {streak.current === 1 ? 'entreno seguido' : 'entrenos seguidos'}
              {streak.best > streak.current && ` · mejor: ${streak.best}`}
            </span>
          </div>
        </div>
      </div>

      {/* Peso y medidas · buscador del historial */}
      <div className="px-4 mb-4 flex flex-col gap-2">
        <button
          onClick={() => setShowMedidas(true)}
          className="w-full bg-card border border-border-hi rounded-2xl p-4 flex items-center gap-3"
          style={{ minHeight: 64 }}
        >
          <span className="text-xl" aria-hidden="true">⚖️</span>
          <span className="flex-1 text-left min-w-0">
            <span className="block font-semibold text-ink text-sm">Peso y medidas</span>
            <span className="block text-dim text-xs mt-0.5">
              {ultimaMedida?.weightKg
                ? <><span className="num">{formatKg(ultimaMedida.weightKg)}</span> kg · {new Date(ultimaMedida.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</>
                : 'Todavía sin anotar'}
            </span>
            {pesos.length > 1 && difPeso !== 0 && (
              <span className="block text-xs mt-0.5" style={{ color: S.ink }}>
                <span className="num">{difPeso > 0 ? '+' : '−'}{formatKg(Math.abs(Math.round(difPeso * 10) / 10))} kg</span>
                <span className="text-dim"> {lapso(pesos[pesos.length - 1].date - pesos[0].date)}</span>
              </span>
            )}
          </span>
          {pesos.length > 1 && (
            <span style={{ width: 84, height: 34, flexShrink: 0 }}>
              <Sparkline values={pesos.map(m => m.weightKg!)} color={S.dim} width={84} height={34} />
            </span>
          )}
          <span className="text-dim text-lg" aria-hidden="true">›</span>
        </button>
        <button
          onClick={() => setShowBuscador(true)}
          className="w-full bg-card border border-border-hi rounded-2xl p-4 flex items-center gap-3"
          style={{ minHeight: 64 }}
        >
          <span className="text-xl" aria-hidden="true">🔎</span>
          <span className="flex-1 text-left">
            <span className="block font-semibold text-ink text-sm">Buscar en el historial</span>
            <span className="block text-dim text-xs mt-0.5">Cuándo hiciste un ejercicio y con cuánto</span>
          </span>
          <span className="text-dim text-lg" aria-hidden="true">›</span>
        </button>
      </div>

      {/* Ajustes */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full bg-card border border-border-hi rounded-2xl p-4 flex items-center gap-3"
        >
          <span className="text-xl" aria-hidden="true">⚙️</span>
          <span className="flex-1 text-left font-semibold text-ink text-sm">Ajustes</span>
          <span className="text-dim text-lg" aria-hidden="true">›</span>
        </button>
      </div>

      {/* App info */}
      <div className="px-4">
        <div className="bg-card border border-border-hi rounded-2xl p-4">
          <h2 className="font-bold text-ink text-base mb-3">Información</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dim">Versión</span>
              <span className="text-ink/80">{__APP_VERSION__}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Actualizada</span>
              <span className="text-ink/80">{__BUILD_DATE__}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Ejercicios disponibles</span>
              <span className="text-ink/80">{allExercises.length}</span>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
      {showMedidas && <MedidasSheet onClose={() => setShowMedidas(false)} />}
      {showBuscador && <HistorialBuscadorSheet onClose={() => setShowBuscador(false)} />}
    </div>
  )
}
