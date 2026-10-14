import { useEffect, useState } from 'react'
import type { Exercise } from '../types'
import { muscleGroupConfig } from '../data/muscleGroups'
import { exerciseDetails } from '../data/exerciseDetails'
import { MuscleBodyMap } from './MuscleBodyMap'
import { MuscleIcon } from './MuscleIcon'

interface WgerInfo {
  imageUrl?: string
}

/** Lee de forma síncrona la info de wger ya cacheada en sessionStorage (o null). */
function getCachedWgerInfo(wgerId: number | undefined): WgerInfo | null {
  if (!wgerId) return null
  try {
    const cached = sessionStorage.getItem(`wger-${wgerId}`)
    return cached ? (JSON.parse(cached) as WgerInfo) : null
  } catch {
    return null
  }
}

interface Props {
  exercise: Exercise
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

export function ExerciseDetailSheet({ exercise, onClose, actionLabel, onAction, actionDisabled }: Props) {
  const detail = exerciseDetails[exercise.id]
  const config = muscleGroupConfig[exercise.muscleGroup]
  const displayName = detail?.nameArg ?? exercise.nameArg ?? exercise.nameEs

  const wgerId = detail?.wgerId ?? exercise.wgerId

  const [wgerInfo, setWgerInfo] = useState<WgerInfo | null>(() => getCachedWgerInfo(wgerId))
  const [imgError, setImgError] = useState(false)

  // Reseteamos el estado derivado del ejercicio durante el render (patrón
  // recomendado de React) en vez de con setState dentro del efecto, que dispara
  // renders en cascada. Sembramos la info ya cacheada para no re-pedirla.
  // Ver: https://react.dev/learn/you-might-not-need-an-effect
  const [prevExId, setPrevExId] = useState(exercise.id)
  if (prevExId !== exercise.id) {
    setPrevExId(exercise.id)
    setWgerInfo(getCachedWgerInfo(wgerId))
    setImgError(false)
  }

  useEffect(() => {
    if (wgerId) {
      // Si ya estaba cacheado, el render lo sembró: no hace falta pedirlo.
      if (getCachedWgerInfo(wgerId)) return
      fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/?format=json`)
        .then(r => r.json())
        .then(data => {
          const imageUrl = data.images?.[0]?.image ?? null
          const info: WgerInfo = { imageUrl: imageUrl ?? undefined }
          sessionStorage.setItem(`wger-${wgerId}`, JSON.stringify(info))
          setWgerInfo(info)
        })
        .catch(() => { /* ignore */ })
      return
    }

    if (!exercise.nameEn) return

    const searchAndFetch = async () => {
      try {
        const searchKey = `wger-search-${exercise.id}`
        let baseId: number | null = null
        const searchCached = sessionStorage.getItem(searchKey)
        if (searchCached) {
          baseId = JSON.parse(searchCached).baseId ?? null
        } else {
          const res = await fetch(
            `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(exercise.nameEn!)}&language=english&format=json`
          )
          const data = await res.json()
          baseId = data.suggestions?.[0]?.data?.base_id ?? null
          sessionStorage.setItem(searchKey, JSON.stringify({ baseId }))
        }
        if (!baseId) { setWgerInfo(null); return }
        const imgKey = `wger-${baseId}`
        const imgCached = sessionStorage.getItem(imgKey)
        if (imgCached) { setWgerInfo(JSON.parse(imgCached) as WgerInfo); return }
        const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${baseId}/?format=json`)
        const data = await res.json()
        const imageUrl: string | null = data.images?.[0]?.image ?? null
        const info: WgerInfo = { imageUrl: imageUrl ?? undefined }
        sessionStorage.setItem(imgKey, JSON.stringify(info))
        setWgerInfo(info)
      } catch { setWgerInfo(null) }
    }

    void searchAndFetch()
  }, [exercise.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const imageUrl = wgerInfo?.imageUrl

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-card border-t border-border rounded-t-3xl sheet-enter max-h-[82vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto scroll-area pb-6">
          {/* Header */}
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Exercise muscle map */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.color + '18', border: `1px solid ${config.color}25` }}
                >
                  <MuscleBodyMap muscleGroup={exercise.muscleGroup} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-ink leading-tight">{displayName}</h2>
                  {detail?.nameArg && detail.nameArg !== exercise.nameEs && (
                    <p className="text-xs text-dim mt-0.5">{exercise.nameEs}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
                      style={{ color: config.color, backgroundColor: config.color + '20', border: `1px solid ${config.color}40` }}
                    >
                      <MuscleIcon group={exercise.muscleGroup} size={20} /> {config.label}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full text-dim bg-surface border border-border">
                      {exercise.equipment}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-dim text-2xl leading-none mt-1 flex-shrink-0">×</button>
            </div>
          </div>

          {/* Image or SVG fallback */}
          <div className="mx-5 mb-4 rounded-2xl overflow-hidden h-44 flex items-center justify-center border border-border"
            style={{ background: config.color + '08' }}
          >
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="h-full w-full object-contain p-2"
                onError={() => setImgError(true)}
              />
            ) : wgerId && !imgError ? (
              <WgerImage wgerId={wgerId} name={displayName} onError={() => setImgError(true)}
                fallback={<MuscleBodyMap muscleGroup={exercise.muscleGroup} size={96} />}
              />
            ) : (
              <MuscleBodyMap muscleGroup={exercise.muscleGroup} size={96} />
            )}
          </div>

          {/* Muscles */}
          {detail && (
            <div className="px-5 mb-4">
              <div className="flex gap-3">
                {detail.primaryMuscles.length > 0 && (
                  <div className="flex-1 bg-surface rounded-xl p-3 border border-border">
                    <p className="section-label mb-2">Músculos principales</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.primaryMuscles.map(m => (
                        <span key={m} className="text-xs px-2 py-0.5 rounded-full text-ink bg-primary/15 border border-primary/20">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.secondaryMuscles.length > 0 && (
                  <div className="flex-1 bg-surface rounded-xl p-3 border border-border">
                    <p className="section-label mb-2">Secundarios</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.secondaryMuscles.map(m => (
                        <span key={m} className="text-xs px-2 py-0.5 rounded-full text-dim bg-surface border border-border">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {detail?.instructions && detail.instructions.length > 0 && (
            <div className="px-5 mb-4">
              <p className="section-label mb-3">Instrucciones</p>
              <div className="flex flex-col gap-2">
                {detail.instructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: config.color + '20', color: config.color }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-ink leading-relaxed flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {detail?.tips && detail.tips.length > 0 && (
            <div className="px-5 mb-4">
              <p className="section-label mb-3">Tips clave</p>
              <div className="flex flex-col gap-2">
                {detail.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="text-primary text-sm mt-0.5 flex-shrink-0">✓</span>
                    <p className="text-sm text-dim">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!detail && (
            <div className="px-5 py-4 mx-5 bg-surface rounded-2xl border border-border text-center">
              <p className="text-dim text-sm">Instrucciones próximamente</p>
            </div>
          )}
        </div>

        {/* Action button */}
        {actionLabel && onAction && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={onAction}
              disabled={actionDisabled}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                actionDisabled
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'btn-primary'
              }`}
            >
              {actionDisabled ? '✓ Agregado' : actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WgerImage({ wgerId, name, onError, fallback }: { wgerId: number; name: string; onError: () => void; fallback?: React.ReactNode }) {
  // Read cache synchronously in initializer to avoid setState-in-effect lint error
  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    try {
      const cached = sessionStorage.getItem(`wger-${wgerId}`)
      if (cached) {
        const data = JSON.parse(cached)
        return data.imageUrl ?? null
      }
    } catch { /* ignore */ }
    return null
  })

  useEffect(() => {
    const cached = sessionStorage.getItem(`wger-${wgerId}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        if (!data.imageUrl) onError()
      } catch { onError() }
      return
    }
    fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/?format=json`)
      .then(r => r.json())
      .then(data => {
        const url = data.images?.[0]?.image ?? null
        sessionStorage.setItem(`wger-${wgerId}`, JSON.stringify({ imageUrl: url }))
        if (url) setImageUrl(url)
        else onError()
      })
      .catch(onError)
  }, [wgerId, onError])

  if (!imageUrl) return (
    <div className="flex items-center justify-center w-full h-full">
      {fallback ?? (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-mute">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
          <path d="M24 14 L24 26 M24 30 L24 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  )

  return <img src={imageUrl} alt={name} className="h-full w-full object-contain p-2" onError={onError} />
}
