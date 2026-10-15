import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { ExerciseThumbnail } from '../components/ExerciseThumbnail'
import { useAllExercises, useStore } from '../store/useStore'
import { segundoTabata, tabataDelEntreno, useWorkoutStore } from '../stores/workoutStore'
import { duracionTabata, estadoTabata, eventosTabata, mmss, objetivoTabata, rondaAlcanzada, tiempoAnterior, tiempoSaltar, tituloCorto } from '../utils/bloques'
import { playBeep, primeAudio, vibrate } from '../utils/haptics'
import { rutinaEnUso } from '../utils/routineVariant'
import { S } from '../theme'

const C = S.tabata

function Icono({ d, size = 22 }: { d: 'x' | 'sonido' | 'mudo' | 'pausa' | 'play' | 'sig' | 'ant'; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (d) {
    case 'x': return <svg {...props}><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" /></svg>
    case 'sonido': return <svg {...props}><g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity={0.15} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></g></svg>
    case 'mudo': return <svg {...props}><g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity={0.15} /><path d="M16 9.5l5 5M21 9.5l-5 5" /></g></svg>
    case 'pausa': return <svg {...props}><g fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.3" /><rect x="13.5" y="5" width="4" height="14" rx="1.3" /></g></svg>
    case 'play': return <svg {...props}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
    case 'sig': return <svg {...props}><g fill="currentColor"><path d="M5.5 6v12l9-6z" /><rect x="16" y="6" width="2.6" height="12" rx="1" /></g></svg>
    case 'ant': return <svg {...props}><g fill="currentColor"><path d="M18.5 6v12l-9-6z" /><rect x="5.4" y="6" width="2.6" height="12" rx="1" /></g></svg>
  }
}

/**
 * El cronómetro del tabata, a pantalla completa.
 *
 * El tiempo sale del reloj de pared (`tabata.inicio` en el store), igual que
 * el descanso: si iOS congela la PWA con la pantalla bloqueada, al volver
 * muestra lo que realmente va. La pantalla encendida la pide el entreno
 * (useWakeLock en ActiveWorkoutScreen), que sigue montado debajo.
 *
 * Colores: S.tabata (design-tokens.js). Es un vidrio sobre el entreno, que
 * se ve detrás desenfocado (.tabata-fase en index.css): en el trabajo, un velo
 * claro con el anillo en coral; en el descanso, más oscuro, así se distingue
 * de un vistazo.
 */
export function TabataOverlay() {
  const exercises = useAllExercises()
  const routines = useStore((s) => s.routines)
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout)
  const { pausarTabata, reanudarTabata, moverTabata, alternarSonidoTabata, cerrarTabata } = useWorkoutStore()

  const [ahora, setAhora] = useState(() => Date.now())
  const [aviso, setAviso] = useState('')
  const tAnterior = useRef<number | null>(null)
  const cerrado = useRef(false)

  // Cierra, marca las series de las rondas hechas y avisa cuántas.
  const cerrar = useRef((terminado: boolean) => {
    if (cerrado.current) return
    cerrado.current = true
    const n = cerrarTabata()
    const { addToast } = useStore.getState()
    if (terminado) addToast(`¡Tabata terminado! ${n} ${n === 1 ? 'serie marcada' : 'series marcadas'}`, 'success')
    else if (n > 0) addToast(`Tabata: ${n} ${n === 1 ? 'serie marcada' : 'series marcadas'}`, 'success')
  })

  useEffect(() => {
    const tick = () => {
      const aw = useWorkoutStore.getState().activeWorkout
      if (!aw?.tabata || cerrado.current) return
      const plan = tabataDelEntreno(aw)
      if (!plan) { cerrar.current(false); return }
      const now = Date.now()
      const t = segundoTabata(aw.tabata, now)
      const antes = tAnterior.current
      tAnterior.current = t
      setAhora(now)
      if (antes == null) {
        // Volvió de una recarga con el tabata ya terminado: se cierra y marca.
        if (t >= duracionTabata(plan.tramos)) cerrar.current(true)
        return
      }
      const sonido = aw.tabata.sonido
      const nombre = (i: number) => exercises.find((e) => e.id === aw.exercises[plan.grupo.indices[i]]?.exerciseId)?.nameEs ?? 'Ejercicio'
      for (const ev of eventosTabata(plan.tramos, antes, t)) {
        if (ev.tipo === 'cuenta') {
          vibrate(40)
          if (sonido) playBeep(660, 120)
        } else if (ev.tipo === 'tramo') {
          const tr = plan.tramos[ev.idx]
          if (tr.tipo === 'trabajo') {
            vibrate([120])
            if (sonido) playBeep(880, 350)
            setAviso(`Trabajo: ${nombre(tr.ejercicio)}, ${plan.cfg.trabajo} segundos`)
          } else {
            vibrate([60, 40, 60])
            if (sonido) playBeep(520, 300)
            setAviso(`Descanso, ${plan.cfg.descanso} segundos. Sigue ${nombre(tr.ejercicio)}`)
          }
        } else {
          vibrate([150, 80, 150, 80, 300])
          if (sonido) { playBeep(660, 250); setTimeout(() => playBeep(880, 300), 300) }
          setAviso('Tabata terminado')
          cerrar.current(true)
        }
      }
    }
    const id = setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [exercises])

  if (!activeWorkout?.tabata) return null
  const plan = tabataDelEntreno(activeWorkout)
  if (!plan) return null

  const tab = activeWorkout.tabata
  const { tramos, cfg, grupo, bloque } = plan
  const t = segundoTabata(tab, ahora)
  const estado = estadoTabata(tramos, t)
  const tramo = estado.tramo
  if (!tramo) return null
  const pausado = !!tab.pausadoEn
  const trabajo = tramo.tipo === 'trabajo'
  const total = duracionTabata(tramos)

  const guardada = routines.find((r) => r.id === activeWorkout.routineId)
  const rutina = guardada ? rutinaEnUso(guardada) : undefined
  const ejDe = (i: number) => {
    const aex = activeWorkout.exercises[grupo.indices[i]]
    const ex = exercises.find((e) => e.id === aex?.exerciseId)
    const re = rutina?.exercises.find((r) => r.exerciseId === (aex?.exerciseId)) ?? rutina?.exercises.find((r) => r.exerciseId === aex?.reemplazaA)
    return { ex, re }
  }

  // El que se hace ahora (o el que viene, en el descanso) y el siguiente.
  const trabajosDespues = tramos.filter((x, i) => x.tipo === 'trabajo' && i > estado.idx)
  const actual = ejDe(tramo.ejercicio)
  const siguienteTramo = trabajo ? trabajosDespues[0] : trabajosDespues[1]
  const siguiente = siguienteTramo ? ejDe(siguienteTramo.ejercicio) : null

  const largo = tramo.fin - tramo.inicio
  const queda = Math.max(0, tramo.fin - Math.max(t, tramo.inicio))
  const circ = 2 * Math.PI * 124
  const offset = circ * (1 - (largo > 0 ? queda / largo : 0))

  // Colores de la fase: trabajo con el velo claro, descanso más oscuro.
  // El último color de `fondo` es la capa de abajo; sin desenfoque, index.css
  // la vuelve opaca para que no se lea el entreno a través.
  const fondo = trabajo ? `linear-gradient(${C.bg}, ${C.bg}), ${C.scrim}` : C.restScrim
  const tinta = C.ink
  const arco = trabajo ? C.ring : C.rest
  const riel = trabajo ? C.track : S.line2
  const suave = C.soft
  const chip = trabajo ? C.chip : S.surf2
  const numero = trabajo ? C.ink : C.rest
  const marcoMiniatura = S.bg

  const hechasEnSesion = rondaAlcanzada(tramos, t, tab.desdeRonda) - tab.desdeRonda
  const cerrarLabel = hechasEnSesion > 0
    ? `Cerrar el tabata y marcar ${hechasEnSesion} ${hechasEnSesion === 1 ? 'ronda hecha' : 'rondas hechas'}`
    : 'Cerrar el tabata'

  const boton: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 22, background: suave, border: 'none', color: tinta,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }
  const control = (label: string, icono: 'ant' | 'sig', onClick: () => void) => (
    <button onClick={onClick} aria-label={label === 'Anterior' ? 'Volver al intervalo anterior' : 'Saltar al siguiente intervalo'}
      style={{ width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: tinta, cursor: 'pointer', padding: 0 }}>
      <span style={{ width: 52, height: 52, borderRadius: 26, background: suave, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icono d={icono} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{label}</span>
    </button>
  )

  return (
    <Dialog
      label={`Tabata, ${tituloCorto(bloque.nombre ?? 'Tabata')}`}
      onClose={() => cerrar.current(false)}
      className="absolute inset-0 z-[60] flex flex-col tabata-fase"
      style={{ background: fondo, color: tinta, overflowY: 'auto' }}
    >
      <div className="flex flex-col tabata-cuerpo" style={{ flex: 1, minHeight: 0, padding: '54px 22px 34px' }}>
        {/* Arriba: cerrar, título con lo que queda, sonido */}
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <button onClick={() => cerrar.current(false)} aria-label={cerrarLabel} style={boton}><Icono d="x" size={20} /></button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{tituloCorto(bloque.nombre ?? 'Tabata')}</div>
            <div className="num" style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, marginTop: 2, letterSpacing: 0 }}>
              Quedan {mmss(estado.restanteTotal)} de {mmss(total)}
            </div>
          </div>
          <button onClick={() => { primeAudio(); alternarSonidoTabata() }} aria-pressed={tab.sonido}
            aria-label={tab.sonido ? 'Sonido activado. Tocá para silenciar' : 'Sin sonido. Tocá para activarlo'} style={boton}>
            <Icono d={tab.sonido ? 'sonido' : 'mudo'} />
          </button>
        </div>

        {/* Ronda */}
        <div className="flex items-center justify-between" style={{ marginTop: 22, gap: 12 }}>
          <b style={{ fontSize: 22, fontWeight: 700, flexShrink: 0 }}>Ronda <span className="num">{tramo.ronda + 1}/{cfg.rondas}</span></b>
          <div className="flex" style={{ gap: 5, flex: 1, justifyContent: 'flex-end', minWidth: 0 }} aria-hidden="true">
            {Array.from({ length: cfg.rondas }, (_, r) => (
              // Hechas en el color del arco, la de ahora a media tinta, las que faltan en el riel.
              <i key={r} style={{
                flex: '0 1 30px', minWidth: 6, height: 6, borderRadius: 3, display: 'block',
                background: r <= tramo.ronda ? arco : riel,
                opacity: r === tramo.ronda ? 0.5 : 1,
              }} />
            ))}
          </div>
        </div>

        {/* Anillo con el número grande */}
        <div className="tabata-anillo" style={{ position: 'relative', width: 'min(272px, 100%, 34vh)', aspectRatio: '1', margin: '22px auto 0' }}>
          <svg viewBox="0 0 272 272" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            <circle cx={136} cy={136} r={124} fill="none" stroke={riel} strokeWidth={12} />
            <circle cx={136} cy={136} r={124} fill="none" stroke={arco} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 136 136)"
              style={{ transition: pausado ? 'none' : 'stroke-dashoffset 0.2s linear' }} />
          </svg>
          <div className="flex flex-col items-center justify-center" style={{ position: 'absolute', inset: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: chip }}>
              {pausado ? 'En pausa' : trabajo ? 'Trabajo' : 'Descanso'}
            </span>
            {/* La única excepción a la escala tipográfica: se lee de lejos. */}
            <span className={`num tabata-numero${!pausado && estado.restante <= 3 ? ' late' : ''}`} role="timer"
              aria-label={`Quedan ${estado.restante} segundos de ${trabajo ? 'trabajo' : 'descanso'}`}
              style={{ fontSize: 'min(96px, 12vh)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, marginTop: 8, color: numero }}>
              {mmss(estado.restante)}
            </span>
          </div>
        </div>

        {/* El ejercicio de ahora (en el descanso, el que viene) */}
        <div className="flex items-center tabata-actual" style={{ marginTop: 24, gap: 14 }}>
          <div className="tabata-mini" style={{ width: 64, height: 64, borderRadius: 16, background: marcoMiniatura, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {actual.ex && <ExerciseThumbnail exercise={actual.ex} size={56} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>{actual.ex?.nameEs ?? 'Ejercicio'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75, marginTop: 4 }}>
              {trabajo ? '' : 'Sigue · '}Ejercicio {tramo.ejercicio + 1} de {grupo.indices.length}{actual.re ? ` · ${objetivoTabata(actual.re)}` : ''}
            </div>
          </div>
        </div>

        {/* Qué viene después */}
        <div className="flex items-center tabata-sigue" style={{ marginTop: 16, gap: 10, padding: '12px 14px', borderRadius: 12, background: suave, minHeight: 64 }}>
          {siguiente?.ex && (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: marcoMiniatura, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              <ExerciseThumbnail exercise={siguiente.ex} size={36} />
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>
            {siguiente?.ex ? (
              <>
                {trabajo ? 'Sigue' : 'Después'}: <b style={{ fontWeight: 700 }}>{siguiente.ex.nameEs}</b>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>
                  {trabajo
                    ? (cfg.descanso > 0 ? `Después de ${cfg.descanso} s de descanso` : 'Sin descanso')
                    : `Después de ${cfg.trabajo} s de trabajo`}
                </span>
              </>
            ) : (
              <>Es el último<span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>Al terminar se marcan las series del bloque</span></>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-between tabata-controles" style={{ marginTop: 'auto', padding: '20px 8px 0' }}>
          {control('Anterior', 'ant', () => moverTabata(tiempoAnterior(tramos, t)))}
          <button
            onClick={() => { primeAudio(); if (pausado) reanudarTabata(); else pausarTabata() }}
            aria-label={pausado ? 'Seguir' : 'Pausa'}
            className="tabata-pausa"
            style={{ width: 80, height: 80, borderRadius: 40, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: trabajo ? C.pause : C.rest, color: trabajo ? C.pauseInk : S.bg }}
          >
            <Icono d={pausado ? 'play' : 'pausa'} size={34} />
          </button>
          {control('Saltar', 'sig', () => moverTabata(tiempoSaltar(tramos, t)))}
        </div>
        <div className="flex items-center justify-center tabata-pitido" style={{ marginTop: 18, gap: 6, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
          <Icono d={tab.sonido ? 'sonido' : 'mudo'} size={15} />
          {tab.sonido ? 'Suena un pitido en 3, 2, 1' : 'Sin sonido: sólo vibra'}
        </div>
      </div>
      <div aria-live="assertive" className="sr-only">{aviso}</div>
    </Dialog>
  )
}
