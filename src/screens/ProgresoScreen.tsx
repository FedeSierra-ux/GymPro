import { useEffect, useMemo, useState } from 'react'
import { useHoy } from '../utils/useHoy'
import { useStore, useAllExercises } from '../store/useStore'
import { muscleGroupConfig } from '../data/muscleGroups'
import { ExerciseHistorySheet } from '../components/ExerciseHistorySheet'
import { Sparkline } from '../components/Sparkline'
import { buildProgressSeries, estaEstancado, SESIONES_ESTANCADO, unidadDe, type ExerciseSeries } from '../utils/progressSeries'
import { resumenMensual, seriesPorGrupo } from '../utils/volume'
import { BodyFigure } from '../components/BodyFigure'
import { MuscleIcon } from '../components/MuscleIcon'
import { formatDuration } from '../utils/duration'
import { R, S, T } from '../theme'
import type { MuscleGroup } from '../types'
import { formatKg } from '../utils/format'
import { compararPeriodos, resumenPeriodo, type Delta } from '../utils/periodSummary'
import {
  ciclosParaListar, fechaLarga, rangoCiclo, rangosParaComparar, textoHoras, textoMarca, textoPct, type ModoComparacion,
} from '../utils/informes'
import { SEMANAS_PROGRAMA } from '../utils/program'

type Period = '6s' | '3m' | '6m' | 'todo'
type Tab = 'fuerza' | 'musculos' | 'resumen'


const PERIODOS: [Period, string, number][] = [
  ['6s', '6 sem', 42],
  ['3m', '3 meses', 92],
  ['6m', '6 meses', 183],
  ['todo', 'Todo', 3650],
]

const MUSCLE_ORDER: MuscleGroup[] = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'piernas', 'gluteos', 'core', 'cardio']

/** El valor de una marca, escrito con la unidad que corresponde al ejercicio. */
function formatValor(serie: Pick<ExerciseSeries, 'kind' | 'current' | 'currentReps'>): string {
  switch (serie.kind) {
    case 'kg': return `${formatKg(serie.current)} kg`
    case 'reps': return `${serie.current} reps`
    case 'tiempo': return formatDuration(serie.current)
  }
}

/** El cambio sin signo, con coma y su unidad: "7,5 kg", "2 reps", "15s". */
function formatDelta(kind: ExerciseSeries['kind'], change: number): string {
  const v = Math.abs(change)
  if (kind === 'tiempo') return `${Math.round(v)}s`
  return `${formatKg(Math.round(v * 10) / 10)} ${unidadDe(kind)}`
}

/** El cambio para la columna angosta de la fila, sin unidad: "↑7,5". */
function deltaCorto(kind: ExerciseSeries['kind'], change: number): string {
  if (change === 0) return '='
  const v = Math.abs(change)
  const n = kind === 'tiempo' ? `${Math.round(v)}s` : formatKg(Math.round(v * 10) / 10)
  return `${change > 0 ? '↑' : '↓'}${n}`
}

/* ------------------------------------------------------------------- Series */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Una tarjeta de cifra con el cambio contra la referencia. */
function CifraComparada({ etiqueta, valor, delta, formato = String, record, hayReferencia }: {
  etiqueta: string
  valor: string
  delta: Delta
  formato?: (n: number) => string
  record?: boolean
  hayReferencia: boolean
}) {
  const d = delta.diferencia
  const color = !hayReferencia || d === 0 ? S.mute : d > 0 ? S.good : S.bad
  const texto = !hayReferencia
    ? '—'
    : d === 0
      ? 'igual'
      : `${d > 0 ? '↑' : '↓'} ${formato(Math.abs(d))}${delta.pct != null ? ` (${textoPct(delta.pct)})` : ''}`
  return (
    <div
      aria-label={`${etiqueta}: ${valor}${hayReferencia ? `, ${d === 0 ? 'igual que' : d > 0 ? `${formato(Math.abs(d))} más que` : `${formato(Math.abs(d))} menos que`} la referencia` : ''}`}
      style={{ background: S.surf2, borderRadius: R.lg, padding: '12px 12px', border: `1px solid ${S.line2}`, minWidth: 0 }}
    >
      <div aria-hidden="true" className="num" style={{ fontSize: T.h2, fontWeight: 700, color: record && valor !== '0' ? S.acc2 : S.ink }}>{valor}</div>
      <div aria-hidden="true" style={{ fontSize: T.micro, color: S.dim, marginTop: 2 }}>{etiqueta}</div>
      <div aria-hidden="true" className="num" style={{ fontSize: T.micro, fontWeight: 700, color, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{texto}</div>
    </div>
  )
}

/** Ciclos del plan: el que está en curso (informe parcial) y los pasados. */
function BloqueCiclos({ nowTs }: { nowTs: number }) {
  const { programa, ciclosPrograma, abrirInforme } = useStore()
  const ciclos = ciclosParaListar(programa, ciclosPrograma, nowTs)
  if (!ciclos.length) return null
  return (
    <section aria-label="Ciclos del plan" style={{ background: S.surf, borderRadius: R.lg, padding: '12px 14px 4px', border: `1px solid ${S.line2}` }}>
      <h3 style={{ fontWeight: 700, color: S.ink, fontSize: T.body }}>Ciclos</h3>
      <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
        {ciclos.map((c) => (
          <li key={c.inicio} style={{ borderTop: `1px solid ${S.line}` }}>
            <button
              onClick={() => abrirInforme({ tipo: 'ciclo', inicio: c.inicio, fin: c.fin })}
              aria-label={`Ciclo del ${rangoCiclo(c.inicio, c.fin)}${c.enCurso ? `, semana ${c.semana} de ${SEMANAS_PROGRAMA}. Ver el informe parcial` : '. Ver el informe'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, background: 'none', border: 'none', padding: '6px 0', textAlign: 'left', cursor: 'pointer', color: S.ink }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: T.body, fontWeight: 600 }}>
                Ciclo {rangoCiclo(c.inicio, c.fin)}
              </span>
              <span style={{ fontSize: T.caption, color: c.enCurso ? S.ink : S.dim, whiteSpace: 'nowrap' }}>
                {c.enCurso ? <>Semana <span className="num">{c.semana}</span> de <span className="num">{SEMANAS_PROGRAMA}</span></> : 'Terminado'}
              </span>
              <span aria-hidden="true" style={{ color: S.mute, fontSize: T.title }}>›</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Resumen del mes: cifras contra el mes anterior (o el mismo mes del año
 * pasado), lo destacado, y abajo las series por grupo y por ejercicio.
 */
function ResumenTab({ nowTs, inicial }: { nowTs: number; inicial: { year: number; month: number } | null }) {
  const { workouts, prs, abrirInforme } = useStore()
  const exercises = useAllExercises()
  const hoy = new Date(nowTs)
  const [cursor, setCursor] = useState(() => (inicial ? { anio: inicial.year, mes: inicial.month } : { anio: hoy.getFullYear(), mes: hoy.getMonth() }))
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [modo, setModo] = useState<ModoComparacion>('anterior')
  const [todosLosRecords, setTodosLosRecords] = useState(false)

  const esMesActual = cursor.anio === hoy.getFullYear() && cursor.mes === hoy.getMonth()
  const primerEntreno = useMemo(
    () => workouts.reduce((min, w) => (w.finishedAt && w.startedAt < min ? w.startedAt : min), nowTs),
    [workouts, nowTs]
  )
  const inicio = new Date(primerEntreno)
  const esPrimerMes = cursor.anio < inicio.getFullYear() || (cursor.anio === inicio.getFullYear() && cursor.mes <= inicio.getMonth())

  const mover = (d: number) => setCursor(c => {
    const f = new Date(c.anio, c.mes + d, 1)
    return { anio: f.getFullYear(), mes: f.getMonth() }
  })

  const rangos = useMemo(() => rangosParaComparar(cursor.anio, cursor.mes, modo, nowTs), [cursor, modo, nowTs])
  const periodo = useMemo(() => resumenPeriodo({ workouts, exercises, prs, ...rangos.actual }), [workouts, exercises, prs, rangos])
  const referencia = useMemo(() => resumenPeriodo({ workouts, exercises, prs, ...rangos.referencia }), [workouts, exercises, prs, rangos])
  const comparacion = compararPeriodos(periodo, referencia)
  const hayReferencia = referencia.sesiones > 0
  const nombreDe = (id: string) => exercises.find(e => e.id === id)?.nameEs ?? 'Ejercicio borrado'
  const records = todosLosRecords ? periodo.records : periodo.records.slice(0, 5)
  const entrenosDelAnio = workouts.some(w => w.finishedAt && new Date(w.startedAt).getFullYear() === hoy.getFullYear())

  const resumen = useMemo(() => resumenMensual(workouts, exercises, cursor.anio, cursor.mes), [workouts, exercises, cursor])
  const anterior = useMemo(() => resumenMensual(workouts, exercises, cursor.anio, cursor.mes - 1), [workouts, exercises, cursor])
  const maxAnteriorDe = useMemo(() => new Map(anterior.ejercicios.map(e => [e.exerciseId, e.maxKg])), [anterior])

  const grupos = [...resumen.grupos].sort((a, b) => MUSCLE_ORDER.indexOf(a.muscleGroup as MuscleGroup) - MUSCLE_ORDER.indexOf(b.muscleGroup as MuscleGroup))
  const maxSets = Math.max(...grupos.map(g => g.sets), 1)
  const porId = new Map(exercises.map(e => [e.id, e]))
  const ejercicios = [...resumen.ejercicios].sort((a, b) =>
    (porId.get(a.exerciseId)?.nameEs ?? '').localeCompare(porId.get(b.exerciseId)?.nameEs ?? '', 'es', { sensitivity: 'base' })
  )

  const flecha = (habilitada: boolean) => ({
    width: 44, height: 44, borderRadius: 12, border: `1px solid ${S.line2}`, background: S.surf2,
    color: habilitada ? S.ink : S.faint, fontSize: 17, cursor: habilitada ? 'pointer' : 'default',
    opacity: habilitada ? 1 : 0.4,
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button aria-label="Mes anterior" disabled={esPrimerMes} onClick={() => mover(-1)} style={flecha(!esPrimerMes)}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: S.ink }}>{MESES[cursor.mes]} {cursor.anio}</div>
        <button aria-label="Mes siguiente" disabled={esMesActual} onClick={() => mover(1)} style={flecha(!esMesActual)}>›</button>
      </div>

      {/* Contra qué se compara */}
      <div role="group" aria-label="Comparar contra" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: T.caption, color: S.dim, marginRight: 2 }}>Contra:</span>
        {([['anterior', 'mes anterior'], ['anioPasado', 'mismo mes del año pasado']] as [ModoComparacion, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            aria-pressed={modo === m}
            style={{
              minHeight: 36, padding: '0 12px', borderRadius: R.sm, fontSize: T.caption, fontWeight: 600, cursor: 'pointer',
              background: modo === m ? S.surf2 : 'transparent', color: modo === m ? S.ink : S.dim,
              border: `1px solid ${modo === m ? S.line2 : S.line}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <CifraComparada etiqueta={periodo.sesiones === 1 ? 'Entreno' : 'Entrenos'} valor={String(periodo.sesiones)} delta={comparacion.sesiones} hayReferencia={hayReferencia} />
        <CifraComparada etiqueta="Series" valor={String(periodo.series)} delta={comparacion.series} hayReferencia={hayReferencia} />
        <CifraComparada etiqueta="Horas" valor={textoHoras(periodo.minutos)} delta={comparacion.minutos} formato={(m) => `${textoHoras(m)} h`} hayReferencia={hayReferencia} />
        <CifraComparada etiqueta={periodo.records.length === 1 ? 'Récord' : 'Récords'} valor={String(periodo.records.length)} delta={comparacion.records} record hayReferencia={hayReferencia} />
      </div>
      <p style={{ fontSize: T.micro, color: S.mute, marginTop: -4 }}>
        {hayReferencia ? <>Contra {rangos.etiqueta}{rangos.parcial ? ', los mismos días' : ''}.</> : <>Sin entrenos en {rangos.etiqueta} para comparar.</>}
        {periodo.conDuracion < periodo.sesiones && ' Las horas no cuentan los entrenos cargados a mano ni los que se cerraron solos.'}
      </p>

      {/* Lo destacado */}
      {periodo.sesiones > 0 && (periodo.mayorSubida || periodo.records.length > 0 || periodo.mejorSemana) && (
        <section aria-label="Lo destacado" style={{ background: S.surf, borderRadius: R.lg, padding: '14px 14px 10px', border: `1px solid ${S.line2}` }}>
          <h3 style={{ fontWeight: 700, color: S.ink, fontSize: T.body }}>Lo destacado</h3>
          {periodo.mayorSubida && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: T.micro, color: S.mute, fontWeight: 600 }}>La mayor subida</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: T.body, color: S.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nombreDe(periodo.mayorSubida.exerciseId)}
                </span>
                <span className="num" style={{ fontSize: T.body, fontWeight: 700, color: S.good }}>{textoPct(periodo.mayorSubida.pct)}</span>
              </div>
              <div className="num" style={{ fontSize: T.caption, color: S.dim }}>
                {textoMarca(periodo.mayorSubida.kind, periodo.mayorSubida.antes)} → {textoMarca(periodo.mayorSubida.kind, periodo.mayorSubida.despues)}
              </div>
            </div>
          )}
          {periodo.records.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: T.micro, color: S.mute, fontWeight: 600 }}>
                🏆 Récords del mes <span className="num" style={{ color: S.acc2 }}>{periodo.records.length}</span>
              </div>
              <ul style={{ listStyle: 'none', margin: '2px 0 0', padding: 0 }}>
                {records.map((r, i) => (
                  <li key={`${r.exerciseId}-${r.fecha}-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderTop: i ? `1px solid ${S.line}` : undefined }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: T.body, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreDe(r.exerciseId)}</span>
                    <span className="num" style={{ fontSize: T.caption, whiteSpace: 'nowrap' }}>
                      <span style={{ color: S.acc2, fontWeight: 700 }}>{textoMarca(r.kind, r.marca)}</span>
                      {r.anterior && <span style={{ color: S.mute }}> · antes {textoMarca(r.kind, r.anterior)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {periodo.records.length > 5 && (
                <button className="btn-ghost" onClick={() => setTodosLosRecords(v => !v)} aria-expanded={todosLosRecords} style={{ fontSize: T.caption, padding: '0 4px', minHeight: 36 }}>
                  {todosLosRecords ? 'Ver menos' : `Ver los ${periodo.records.length}`}
                </button>
              )}
            </div>
          )}
          {periodo.mejorSemana && (
            <div style={{ marginTop: 12, paddingBottom: 4 }}>
              <div style={{ fontSize: T.micro, color: S.mute, fontWeight: 600 }}>La mejor semana</div>
              <div style={{ fontSize: T.body, color: S.ink, marginTop: 2 }}>
                La del {fechaLarga(periodo.mejorSemana.lunes)}: <b className="num">{periodo.mejorSemana.series}</b> series
              </div>
            </div>
          )}
        </section>
      )}

      {resumen.series === 0 ? (
        <div className="flex items-center justify-center" style={{ padding: '40px 0' }}>
          <p style={{ color: S.mute, fontSize: 13 }}>Sin series registradas en {MESES[cursor.mes].toLowerCase()}</p>
        </div>
      ) : (
        <>
          <div style={{ background: S.surf, borderRadius: 16, padding: 16, border: `1px solid ${S.line2}` }}>
            <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 13, marginBottom: 14 }}>Series por grupo muscular</h3>
            <div className="flex flex-col gap-2.5">
              {grupos.map(g => {
                const cfg = muscleGroupConfig[g.muscleGroup as MuscleGroup]
                if (!cfg) return null
                return (
                  <div key={g.muscleGroup} className="flex items-center gap-3">
                    <div style={{ width: 74, flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ background: S.surf2, height: 20, minWidth: 0 }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, (g.sets / maxSets) * 100)}%`, background: cfg.color + 'cc', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ width: 36, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 700, color: S.ink }}>{g.sets}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: S.surf, borderRadius: 16, padding: '16px 16px 6px', border: `1px solid ${S.line2}` }}>
            <h3 style={{ fontWeight: 700, color: S.ink, fontSize: 13 }}>Por ejercicio</h3>
            <p style={{ fontSize: 11, color: S.dim, marginTop: 2, marginBottom: 8 }}>Series y peso máximo del mes</p>
            {ejercicios.map(e => {
              const ex = porId.get(e.exerciseId)
              if (!ex) return null
              const cfg = muscleGroupConfig[ex.muscleGroup]
              const antes = maxAnteriorDe.get(e.exerciseId) ?? 0
              const dif = antes > 0 && e.maxKg > 0 ? Math.round((e.maxKg - antes) * 10) / 10 : 0
              return (
                <button key={e.exerciseId} onClick={() => setHistoryId(e.exerciseId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 0', background: 'none', border: 'none', borderTop: `1px solid ${S.line2}`, textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: cfg?.color ?? S.dim, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.nameEs}</div>
                    <div style={{ fontSize: 11, color: S.dim, marginTop: 1 }}>{e.sets} {e.sets === 1 ? 'serie' : 'series'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
                      {e.maxKg > 0 ? `${formatKg(e.maxKg)} kg` : e.maxSeg > 0 ? formatDuration(e.maxSeg) : '—'}
                      {e.maxKg > 0 && e.repsAlMax > 0 && <span style={{ fontSize: 11, color: S.mute, fontWeight: 500 }}> × {e.repsAlMax}</span>}
                    </div>
                    {dif !== 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: dif > 0 ? S.good : S.bad }}>{dif > 0 ? '↑ +' : '↓ '}{formatKg(dif)} kg</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Informes: el año y los ciclos del plan */}
      {entrenosDelAnio && (
        <button
          onClick={() => abrirInforme({ tipo: 'anio', year: hoy.getFullYear() })}
          aria-label={`Tu ${hoy.getFullYear()} en el gym`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 56, padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
            borderRadius: R.lg, border: `1px solid ${S.line2}`, color: S.ink,
            background: `radial-gradient(120% 120% at 0% 0%, rgba(232,99,74,0.16), transparent 70%), ${S.surf}`,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: T.bodyLg, fontWeight: 700 }}>Tu <span className="num">{hoy.getFullYear()}</span></span>
            <span style={{ display: 'block', fontSize: T.caption, color: S.dim, marginTop: 1 }}>Tu año en el gym, en tarjetas</span>
          </span>
          <span aria-hidden="true" style={{ color: S.mute, fontSize: T.title }}>›</span>
        </button>
      )}
      <BloqueCiclos nowTs={nowTs} />

      {historyId && <ExerciseHistorySheet exerciseId={historyId} onClose={() => setHistoryId(null)} />}
    </div>
  )
}

/* ----------------------------------------------------------------- Músculos */

/**
 * La figura de frente y de espaldas pintada según cuántas series hiciste de cada
 * grupo en el período, y debajo las cifras: series totales y por semana.
 */
function MusculosTab({ desde, nowTs, dias }: { desde: number; nowTs: number; dias: number }) {
  const { workouts } = useStore()
  const exercises = useAllExercises()
  const porGrupo = useMemo(() => seriesPorGrupo(workouts, exercises, desde, nowTs + 1), [workouts, exercises, desde, nowTs])
  // "Todo" no son diez años: se cuenta desde el primer entreno.
  const primero = workouts.reduce((min, w) => (w.finishedAt && w.startedAt < min ? w.startedAt : min), nowTs)
  const semanas = Math.max(1, (nowTs - Math.max(desde, primero)) / (7 * 86400000))
  const filas = MUSCLE_ORDER
    .filter(g => g !== 'cardio')
    .map(g => ({ g, n: porGrupo.get(g) ?? 0 }))
    .sort((a, b) => b.n - a.n)
  const tope = Math.max(1, ...filas.map(f => f.n))
  const niveles = Object.fromEntries(filas.map(({ g, n }) => [g, n / tope]))

  if (!filas.some(f => f.n > 0)) {
    return <p style={{ color: S.dim, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>Sin series en este período</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div style={{ background: S.surf, borderRadius: 16, padding: '18px 16px 14px', border: `1px solid ${S.line2}` }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BodyFigure niveles={niveles} size={250} color={S.ink} base={0.14} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 110, fontSize: 11, color: S.mute, marginTop: 4 }}>
          <span>Frente</span><span>Espalda</span>
        </div>
        {/* Escala: más intenso, más series */}
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12, fontSize: 11, color: S.dim }}>
          <span>menos</span>
          <span style={{ width: 90, height: 6, borderRadius: 3, background: `linear-gradient(to right, color-mix(in srgb, ${S.ink} 12%, transparent), ${S.ink})` }} />
          <span>más series</span>
        </div>
      </div>

      <div style={{ background: S.surf, borderRadius: 16, padding: '6px 16px', border: `1px solid ${S.line2}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 16, padding: '8px 0 6px', fontSize: 11, color: S.mute, fontWeight: 600 }}>
          <span /> <span style={{ textAlign: 'right' }}>Series</span> <span style={{ textAlign: 'right', minWidth: 52 }}>Por semana</span>
        </div>
        {filas.map(({ g, n }) => (
          <div key={g} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 16, alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${S.line}` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: n ? S.ink : S.dim }}>
              <MuscleIcon group={g} size={18} /> {muscleGroupConfig[g].label}
            </span>
            <span className="num" style={{ fontSize: 13, fontWeight: 700, color: S.ink, textAlign: 'right' }}>{n}</span>
            <span className="num" style={{ fontSize: 13, color: S.dim, textAlign: 'right', minWidth: 52 }}>{formatKg(Math.round((n / semanas) * 10) / 10)}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: S.mute, textAlign: 'center' }}>
        Para crecer se suelen recomendar entre 10 y 20 series por semana de cada grupo · {dias >= 3650 ? 'desde el primer entreno' : `últimos ${dias} días`}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------- Fuerza */

/** Marca de estancado: dos barritas, dibujadas (el carácter ⏸ no está en todas las fuentes). */
function IconoPausa() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-1px' }}>
      <rect x="2" y="1.5" width="3" height="9" rx="1" fill={S.mute} />
      <rect x="7" y="1.5" width="3" height="9" rx="1" fill={S.mute} />
    </svg>
  )
}

/**
 * Una fila por ejercicio: nombre, línea chica, valor actual y cambio. Tocarla
 * abre el gráfico grande. Antes cada ejercicio era una tarjeta con su gráfico y
 * la lista medía 7.000 px.
 */
function FilaEjercicio({ serie, abierta, onToggle, onHistorial }: {
  serie: ExerciseSeries; abierta: boolean; onToggle: () => void; onHistorial: () => void
}) {
  const exercises = useAllExercises()
  const ex = exercises.find(e => e.id === serie.exerciseId)
  if (!ex) return null
  const cfg = muscleGroupConfig[ex.muscleGroup]
  const subió = serie.change > 0
  const bajó = serie.change < 0
  const estancado = estaEstancado(serie)
  const fecha = new Date(serie.lastDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  const valores = serie.points.map(p => p.value)

  return (
    <div style={{ borderTop: `1px solid ${S.line}` }}>
      <button
        onClick={onToggle}
        aria-expanded={abierta}
        aria-label={`${ex.nameEs}: ${formatValor(serie)}${serie.change ? `, ${subió ? 'subió' : 'bajó'} ${formatDelta(serie.kind, serie.change)}` : ''}${estancado ? ', estancado' : ''}`}
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 48px 70px 50px', alignItems: 'center', gap: 8,
          width: '100%', minHeight: 52, padding: '8px 0', background: 'none', border: 'none', textAlign: 'left',
          cursor: 'pointer', color: 'inherit',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ex.nameEs}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: S.dim, marginTop: 1 }}>
            <span className="num">{serie.sessions}</span> {serie.sessions === 1 ? 'sesión' : 'sesiones'} · {fecha}
          </span>
        </span>
        <span style={{ height: 22 }}>
          {/* Un solo código de color por fila: la línea neutra y el punto con el color del cambio. */}
          {valores.length > 1 && <Sparkline values={valores} color={S.dim} puntoColor={subió ? S.good : bajó ? S.bad : S.dim} width={48} height={22} />}
        </span>
        <span className="num" style={{ fontSize: 13, fontWeight: 700, color: S.ink, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {formatValor(serie)}
        </span>
        <span className="num" style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: estancado ? S.mute : subió ? S.good : bajó ? S.bad : S.mute }}>
          {estancado ? <IconoPausa /> : deltaCorto(serie.kind, serie.change)}
        </span>
      </button>
      {abierta && (
        <div style={{ padding: '2px 0 12px' }}>
          {valores.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <Sparkline
                values={valores} color={cfg.color} height={80} width={300}
                ejes={{
                  formato: (v) => serie.kind === 'kg' ? `${formatKg(v)} kg` : serie.kind === 'tiempo' ? formatDuration(v) : `${v} reps`,
                  desde: new Date(serie.points[0].date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
                  hasta: new Date(serie.points[serie.points.length - 1].date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: S.dim }}>
              {serie.kind === 'kg' && serie.currentReps > 0 && <>Última: <span className="num" style={{ color: S.ink }}>{formatKg(serie.current)} × {serie.currentReps}</span>{' · '}</>}
              {estancado
                ? <><span className="num">{serie.sinMejora}</span> sesiones sin superar la marca</>
                : serie.change !== 0 ? <>{subió ? 'Subió' : 'Bajó'} <span className="num">{formatDelta(serie.kind, serie.change)}</span></> : 'Sin cambios'}
            </span>
            <button onClick={onHistorial}
              style={{ minHeight: 36, padding: '0 12px', borderRadius: 12, background: S.surf2, border: `1px solid ${S.line2}`, color: S.ink, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              Historial
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Un solo aviso para todos los estancados, con el consejo una vez (antes cada
 * tarjeta repetía el cartel y el consejo de descarga).
 */
function AvisoEstancados({ series }: { series: ExerciseSeries[] }) {
  const exercises = useAllExercises()
  if (!series.length) return null
  const ejemplo = series.find(s => s.kind === 'kg')
  const nombre = ejemplo ? exercises.find(e => e.id === ejemplo.exerciseId)?.nameEs : undefined
  const descarga = ejemplo ? Math.round((ejemplo.current * 0.9) / 2.5) * 2.5 : 0
  return (
    <div role="note" style={{ background: S.surf2, border: `1px solid ${S.line2}`, borderRadius: 16, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
        <IconoPausa /> <span className="num">{series.length}</span> {series.length === 1 ? 'ejercicio sin mejorar' : 'ejercicios sin mejorar'}
      </div>
      <p style={{ fontSize: 12, color: S.dim, marginTop: 4, lineHeight: 1.45 }}>
        Llevan {SESIONES_ESTANCADO} sesiones o más sin superar su marca. Probá una semana de descarga al 90 % del peso
        {ejemplo && nombre && descarga > 0 && <> (en {nombre}, <span className="num" style={{ color: S.ink }}>{formatKg(descarga)} kg</span>)</>}
        {' '}y volvé a subir, o cambiá a una variante del ejercicio.
      </p>
    </div>
  )
}

/**
 * Orden por avance: primero lo que más subió (en porcentaje, para que 5 kg en
 * sentadilla no le gane siempre a 2 kg en vuelos), después lo estancado, que es
 * lo que pide una decisión, y al final el resto por nombre.
 */
function secciones(series: ExerciseSeries[]): [string, ExerciseSeries[]][] {
  const pct = (s: ExerciseSeries) => (s.baseline > 0 ? s.change / s.baseline : s.change)
  const subieron = series.filter(s => s.change > 0 && !estaEstancado(s)).sort((a, b) => pct(b) - pct(a))
  const estancados = series.filter(s => estaEstancado(s)).sort((a, b) => b.sinMejora - a.sinMejora)
  const resto = series.filter(s => !subieron.includes(s) && !estancados.includes(s))
  return [
    ['Los que más subieron', subieron],
    ['Estancados', estancados],
    ['El resto', resto],
  ]
}

/* ------------------------------------------------------------------ Pantalla */

export function ProgresoScreen() {
  const { workouts } = useStore()
  const exercises = useAllExercises()
  const [period, setPeriod] = useState<Period>('3m')
  // "Ver" en la tarjeta del mes de Inicio abre Resumen en ese mes.
  const progresoMes = useStore(s => s.progresoMes)
  const limpiarProgresoMes = useStore(s => s.limpiarProgresoMes)
  const [mesInicial] = useState(progresoMes)
  const [tab, setTab] = useState<Tab>(progresoMes ? 'resumen' : 'fuerza')
  useEffect(() => { if (progresoMes) limpiarProgresoMes() }, [progresoMes, limpiarProgresoMes])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)
  // Una sola lectura del reloj por montaje: el render tiene que ser puro.
  const nowTs = useHoy()

  const dias = PERIODOS.find(p => p[0] === period)?.[2] ?? 92
  const etiquetaPeriodo = PERIODOS.find(p => p[0] === period)?.[1] ?? ''
  const desde = nowTs - dias * 86400000

  const series = useMemo(
    () => buildProgressSeries(workouts, exercises, desde, nowTs),
    [workouts, exercises, desde, nowTs]
  )

  const nombreDe = (id: string) => exercises.find(e => e.id === id)?.nameEs ?? id
  const ordenadas = useMemo(
    () => [...series].sort((a, b) =>
      nombreDe(a.exerciseId).localeCompare(nombreDe(b.exerciseId), 'es', { sensitivity: 'base' })
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, exercises]
  )

  const gruposConDatos = [...new Set(
    ordenadas.map(s => exercises.find(e => e.id === s.exerciseId)?.muscleGroup).filter(Boolean)
  )] as string[]

  const visibles = selectedMuscle
    ? ordenadas.filter(s => exercises.find(e => e.id === s.exerciseId)?.muscleGroup === selectedMuscle)
    : ordenadas

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Encabezado fijo */}
      <div style={{ flexShrink: 0, paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 22px))', paddingLeft: 22, paddingRight: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: S.ink }}>Progreso</div>

        <div style={{ display: 'flex', background: S.surf, borderRadius: 16, padding: 3, border: `1px solid ${S.line2}`, marginTop: 16 }}>
          {([['fuerza', 'Marcas'], ['musculos', 'Músculos'], ['resumen', 'Resumen']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t ? S.surf2 : 'transparent', color: tab === t ? S.ink : S.dim, transition: 'all 0.15s ease-out' }}>
              {label}
            </button>
          ))}
        </div>

        {tab !== 'resumen' && <div style={{ display: 'flex', background: S.surf, borderRadius: 16, padding: 3, border: `1px solid ${S.line2}`, marginTop: 8 }}>
          {PERIODOS.map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ flex: 1, minHeight: 40, borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: period === p ? S.surf2 : 'transparent', color: period === p ? S.ink : S.dim, transition: 'all 0.15s ease-out' }}>
              {label}
            </button>
          ))}
        </div>}
      </div>

      <div className="flex-1 min-h-0 scroll-area" style={{ padding: '16px 22px 24px' }}>
        {tab === 'resumen' ? (
          <ResumenTab nowTs={nowTs} inicial={mesInicial} />
        ) : tab === 'musculos' ? (
          <MusculosTab desde={desde} nowTs={nowTs} dias={dias} />
        ) : (
          <>
            {gruposConDatos.length > 1 && (
              <div
                className="flex gap-2"
                style={{ marginBottom: 14, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4, scrollbarWidth: 'none', WebkitMaskImage: 'linear-gradient(to right, #000 88%, transparent)' }}
              >
                <button
                  onClick={() => setSelectedMuscle(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, flexShrink: 0, minHeight: 40,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: selectedMuscle === null ? S.acc : S.surf2,
                    border: `1px solid ${selectedMuscle === null ? S.acc : S.line2}`,
                    color: selectedMuscle === null ? S.ink : S.dim,
                  }}
                >Todos</button>
                {gruposConDatos.map(mg => {
                  const cfg = muscleGroupConfig[mg as MuscleGroup]
                  if (!cfg) return null
                  const activo = selectedMuscle === mg
                  return (
                    <button
                      key={mg}
                      onClick={() => setSelectedMuscle(activo ? null : mg)}
                      style={{
                        padding: '8px 14px', borderRadius: 20, flexShrink: 0, minHeight: 40,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: activo ? cfg.color + '33' : S.surf2,
                        border: `1px solid ${activo ? cfg.color : S.line2}`,
                        color: activo ? cfg.color : S.dim,
                      }}
                    >{cfg.label}</button>
                  )
                })}
              </div>
            )}

            {visibles.length === 0 ? (
              <div className="flex items-center justify-center" style={{ padding: '48px 0' }}>
                <div className="text-center">
                  <p style={{ color: S.dim, fontSize: 13 }}>
                    {ordenadas.length > 0 ? 'Sin datos para este grupo muscular' : `Sin entrenos en ${etiquetaPeriodo.toLowerCase()}`}
                  </p>
                  {ordenadas.length === 0 && (
                    <p style={{ color: S.mute, fontSize: 11, marginTop: 4 }}>Probá con un periodo más largo</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <AvisoEstancados series={visibles.filter(estaEstancado)} />
                <div className="flex flex-col gap-5">
                  {secciones(visibles).map(([titulo, lista]) => lista.length > 0 && (
                    <section key={titulo}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: S.dim, marginBottom: 2 }}>
                        {titulo} <span className="num" style={{ color: S.mute, fontWeight: 500 }}>{lista.length}</span>
                      </h3>
                      <div>
                        {lista.map(serie => (
                          <FilaEjercicio
                            key={serie.exerciseId}
                            serie={serie}
                            abierta={abierta === serie.exerciseId}
                            onToggle={() => setAbierta(abierta === serie.exerciseId ? null : serie.exerciseId)}
                            onHistorial={() => setHistoryExerciseId(serie.exerciseId)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {historyExerciseId && (
        <ExerciseHistorySheet exerciseId={historyExerciseId} onClose={() => setHistoryExerciseId(null)} />
      )}
    </div>
  )
}

