import { describe, expect, it } from 'vitest'
import {
  agruparEntreno, cierraRonda, descansoDeGrupo, duracionTabata, esCircuito, esTabata, estadoTabata,
  eventosTabata, leerTabata, lineaTabata, proximaSerie, rellenoTabata, rondaAlcanzada, rondasHechas,
  objetivoTabata, seriesDelTabata, tieneBloques, tiempoAnterior, tiempoSaltar, tituloCorto, type EjercicioMin, type InfoRutina,
} from '../bloques'
import { buildMileRoutines } from '../../data/mileRoutines'

/** Un ejercicio del entreno con `hechas` series tildadas de `total`. */
const ej = (id: string, total = 3, hechas = 0): EjercicioMin => ({
  exerciseId: id,
  sets: Array.from({ length: total }, (_, i) => ({ completed: i < hechas })),
})
const info = (id: string, block?: string, supersetGroup?: string, note?: string): InfoRutina => ({ exerciseId: id, block, supersetGroup, note })
const tildar = (ejs: EjercicioMin[], exIdx: number, setIdx: number) => { ejs[exIdx].sets[setIdx].completed = true }

const mile = (id: string) => buildMileRoutines().find((r) => r.id === id)!
const entrenoDe = (id: string) => mile(id).exercises.map((re) => ej(re.exerciseId, re.sets))

describe('qué bloque es qué', () => {
  it('con los nombres de las rutinas de Mile', () => {
    expect(esCircuito('Circuito de entrada · 3 rondas')).toBe(true)
    expect(esTabata('Tabata 20" / 10" · 4 rondas')).toBe(true)
    // Dice "rondas" pero es tabata: manda el tabata.
    expect(esCircuito('Tabata 20" / 10" · 4 rondas')).toBe(false)
    expect(esCircuito('Principal')).toBe(false)
    expect(esCircuito('Cardio final')).toBe(false)
    expect(esCircuito('Finisher · 3 rondas')).toBe(true)
    expect(esCircuito('Circuito')).toBe(true)
    expect(esCircuito(undefined)).toBe(false)
  })
})

describe('agrupar el entreno', () => {
  it('Mile piernas: circuito, principal suelto y tabata', () => {
    const r = mile('mile-piernas')
    const bloques = agruparEntreno(entrenoDe('mile-piernas'), r.exercises)
    expect(bloques.map((b) => [b.nombre, b.tipo, b.indices.length])).toEqual([
      ['Circuito de entrada · 3 rondas', 'circuito', 3],
      ['Principal', 'normal', 5],
      ['Tabata 20" / 10" · 4 rondas', 'tabata', 4],
    ])
    expect(bloques[0].grupos).toEqual([{ tipo: 'circuito', indices: [0, 1, 2] }])
    expect(bloques[1].grupos.every((g) => g.tipo === 'suelto')).toBe(true)
    expect(bloques[2].grupos).toEqual([{ tipo: 'tabata', indices: [8, 9, 10, 11] }])
  })

  it('Mile full body: la superserie adentro del principal', () => {
    const r = mile('mile-fullbody')
    const bloques = agruparEntreno(entrenoDe('mile-fullbody'), r.exercises)
    expect(bloques[0].grupos.map((g) => [g.tipo, g.indices])).toEqual([
      ['suelto', [0]], ['suelto', [1]], ['superserie', [2, 3]], ['suelto', [4]], ['suelto', [5]], ['suelto', [6]],
    ])
  })

  it('una rutina sin bloques ni superseries queda como siempre', () => {
    const rutina = [info('a'), info('b'), info('c')]
    const bloques = agruparEntreno([ej('a'), ej('b'), ej('c')], rutina)
    expect(bloques).toHaveLength(1)
    expect(bloques[0].nombre).toBeUndefined()
    expect(bloques[0].grupos.map((g) => g.tipo)).toEqual(['suelto', 'suelto', 'suelto'])
    expect(tieneBloques(bloques)).toBe(false)
  })

  it('superserie sin bloques, y una "superserie" de uno no cuenta', () => {
    const rutina = [info('a', undefined, 'g'), info('b', undefined, 'g'), info('c', undefined, 'h'), info('d')]
    const bloques = agruparEntreno([ej('a'), ej('b'), ej('c'), ej('d')], rutina)
    expect(bloques[0].grupos.map((g) => [g.tipo, g.indices])).toEqual([['superserie', [0, 1]], ['suelto', [2]], ['suelto', [3]]])
    expect(tieneBloques(bloques)).toBe(true)
  })

  it('un circuito de un solo ejercicio son series comunes', () => {
    const bloques = agruparEntreno([ej('a')], [info('a', 'Circuito · 3 rondas')])
    expect(bloques[0].grupos).toEqual([{ tipo: 'suelto', indices: [0] }])
  })

  it('un ejercicio agregado en el medio del circuito se suma; al final, no', () => {
    const C = 'Circuito · 3 rondas'
    const rutina = [info('a', C), info('b', C), info('z', 'Principal')]
    const medio = agruparEntreno([ej('a'), ej('nuevo'), ej('b'), ej('z')], rutina)
    expect(medio[0].grupos).toEqual([{ tipo: 'circuito', indices: [0, 1, 2] }])
    const final = agruparEntreno([ej('a'), ej('b'), ej('nuevo'), ej('z')], rutina)
    expect(final.map((b) => b.nombre)).toEqual([C, undefined, 'Principal'])
  })

  it('el que reemplaza a otro hereda su bloque y su superserie', () => {
    const rutina = [info('a', 'P', 'g'), info('b', 'P', 'g')]
    const cambiado = { ...ej('otro'), reemplazaA: 'a' }
    const bloques = agruparEntreno([cambiado, ej('b')], rutina)
    expect(bloques[0].grupos).toEqual([{ tipo: 'superserie', indices: [0, 1] }])
  })
})

describe('la próxima serie va por rondas', () => {
  const C = 'Circuito · 3 rondas'
  const rutina = [info('a', C), info('b', C), info('c', C), info('d', 'Principal')]

  it('A1 → B1 → C1 → A2 → B2 → C2', () => {
    const ejs = [ej('a'), ej('b'), ej('c'), ej('d')]
    const bloques = agruparEntreno(ejs, rutina)
    const orden: string[] = []
    let ultimo = -1
    for (let k = 0; k < 9; k++) {
      const p = proximaSerie(ejs, bloques, ultimo)!
      orden.push(`${'ABC'[p.exIdx]}${p.setIdx + 1}`)
      tildar(ejs, p.exIdx, p.setIdx)
      ultimo = p.exIdx
    }
    expect(orden).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'])
    // Terminado el circuito, sigue el principal.
    expect(proximaSerie(ejs, bloques, ultimo)).toEqual({ exIdx: 3, setIdx: 0 })
  })

  it('el que tiene menos series sale de las últimas rondas', () => {
    const ejs = [ej('a', 2, 2), ej('b', 3, 2), ej('c', 3, 2)]
    const bloques = agruparEntreno(ejs, rutina)
    expect(proximaSerie(ejs, bloques, 2)).toEqual({ exIdx: 1, setIdx: 2 })
  })

  it('si se tildó salteado, vuelve a la primera que falta', () => {
    const ejs = [ej('a'), ej('b'), ej('c')]
    const bloques = agruparEntreno(ejs, rutina)
    tildar(ejs, 1, 0) // B1 antes que A1
    expect(proximaSerie(ejs, bloques, 1)).toEqual({ exIdx: 0, setIdx: 0 })
  })

  it('sin grupos sigue lineal, igual que antes', () => {
    const r = [info('a'), info('b')]
    const ejs = [ej('a', 3, 1), ej('b')]
    const bloques = agruparEntreno(ejs, r)
    expect(proximaSerie(ejs, bloques, 0)).toEqual({ exIdx: 0, setIdx: 1 })
    // Si se confirmó una de B, sigue en B aunque A tenga pendientes.
    tildar(ejs, 1, 0)
    expect(proximaSerie(ejs, bloques, 1)).toEqual({ exIdx: 1, setIdx: 1 })
    // Sin último ejercicio, el primero con pendientes.
    expect(proximaSerie(ejs, bloques, -1)).toEqual({ exIdx: 0, setIdx: 1 })
    ejs.forEach((e) => e.sets.forEach((s) => { s.completed = true }))
    expect(proximaSerie(ejs, bloques, 1)).toBeNull()
  })

  it('la superserie del full body alterna', () => {
    const r = mile('mile-fullbody')
    const ejs = entrenoDe('mile-fullbody')
    const bloques = agruparEntreno(ejs, r.exercises)
    ;[0, 1].forEach((i) => ejs[i].sets.forEach((s) => { s.completed = true }))
    expect(proximaSerie(ejs, bloques, 1)).toEqual({ exIdx: 2, setIdx: 0 })
    tildar(ejs, 2, 0)
    expect(proximaSerie(ejs, bloques, 2)).toEqual({ exIdx: 3, setIdx: 0 })
    tildar(ejs, 3, 0)
    expect(proximaSerie(ejs, bloques, 3)).toEqual({ exIdx: 2, setIdx: 1 })
  })
})

describe('cuándo arranca el descanso', () => {
  const C = 'Circuito · 3 rondas'
  const rutina = [info('a', C), info('b', C), info('c', C)]

  it('sólo al cerrar la ronda', () => {
    const ejs = [ej('a'), ej('b'), ej('c')]
    const g = agruparEntreno(ejs, rutina)[0].grupos[0]
    tildar(ejs, 0, 0)
    expect(cierraRonda(ejs, g, 0, 0)).toBe(false)
    tildar(ejs, 1, 0)
    expect(cierraRonda(ejs, g, 1, 0)).toBe(false)
    tildar(ejs, 2, 0)
    expect(cierraRonda(ejs, g, 2, 0)).toBe(true)
    expect(rondasHechas(ejs, g)).toBe(1)
  })

  it('si a uno le faltan series, la ronda se cierra sin él', () => {
    const ejs = [ej('a', 3, 3), ej('b', 2, 2), ej('c', 3, 2)]
    const g = agruparEntreno(ejs, rutina)[0].grupos[0]
    tildar(ejs, 2, 2)
    expect(cierraRonda(ejs, g, 2, 2)).toBe(true)
  })

  it('un ejercicio suelto nunca cierra ronda', () => {
    expect(cierraRonda([ej('a', 1, 1)], { tipo: 'suelto', indices: [0] }, 0, 0)).toBe(false)
  })

  it('el tiempo: lo elegido, la nota, el bloque o el defecto', () => {
    const base = { ids: ['a', 'b'], defecto: 75 }
    expect(descansoDeGrupo({ ...base, notas: ['Sillón de cuádriceps', 'Por pierna'] })).toBe(75)
    expect(descansoDeGrupo({ ...base, notas: ['Sillón', 'Por pierna · descanso 1:30'] })).toBe(90)
    expect(descansoDeGrupo({ ...base, notas: ['descanso 2 min', 'descanso 1 min'] })).toBe(60)
    expect(descansoDeGrupo({ ...base, notas: [undefined, undefined], nombreBloque: 'Circuito · descanso 1 min' })).toBe(60)
    expect(descansoDeGrupo({ ...base, notas: ['descanso 2 min', undefined], elegidos: { a: 45 } })).toBe(45)
  })
})

describe('tabata', () => {
  it('lee trabajo, descanso y rondas del nombre', () => {
    expect(leerTabata('Tabata 20" / 10" · 4 rondas')).toEqual({ trabajo: 20, descanso: 10, rondas: 4 })
    expect(leerTabata('Tabata 30s/15s x 6 rondas')).toEqual({ trabajo: 30, descanso: 15, rondas: 6 })
    expect(leerTabata('Tabata 40/20')).toEqual({ trabajo: 40, descanso: 20, rondas: 8 })
    expect(leerTabata('Tabata')).toEqual({ trabajo: 20, descanso: 10, rondas: 8 })
    expect(leerTabata(undefined)).toEqual({ trabajo: 20, descanso: 10, rondas: 8 })
    expect(tituloCorto('Tabata 20" / 10" · 4 rondas')).toBe('Tabata 20" / 10"')
    expect(objetivoTabata({ repsMin: 10, repsMax: 15 })).toBe('10–15 reps')
    expect(objetivoTabata({ repsMin: 10, repsMax: 15 }, true)).toBe('10–15')
    expect(objetivoTabata({ repsMin: 8, repsMax: 12, targetSeconds: 20 }, true)).toBe('20 s')
  })

  it('la línea de tiempo: cada ejercicio por turno, ronda por ronda', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 4 }, 4)
    const trabajos = tramos.filter((x) => x.tipo === 'trabajo').map((x) => `R${x.ronda + 1}E${x.ejercicio + 1}`)
    expect(trabajos.slice(0, 6)).toEqual(['R1E1', 'R1E2', 'R1E3', 'R1E4', 'R2E1', 'R2E2'])
    expect(trabajos).toHaveLength(16)
    // 16 trabajos de 20 s y 15 descansos de 10 s: sin descanso al final.
    expect(duracionTabata(tramos)).toBe(16 * 20 + 15 * 10)
    expect(tramos[tramos.length - 1].tipo).toBe('trabajo')
  })

  it('el estado de la maqueta: ronda 2, ejercicio 2, quedan 14 s', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 4 }, 4)
    // Ronda 1 entera (4 × 30 s) + el ejercicio 1 de la ronda 2 (30 s) + 6 s.
    const e = estadoTabata(tramos, 156)
    expect(e.tramo).toMatchObject({ tipo: 'trabajo', ronda: 1, ejercicio: 1 })
    expect(e.restante).toBe(14)
    expect(e.restanteTotal).toBe(470 - 156)
    // En el descanso, el ejercicio es el que viene.
    expect(estadoTabata(tramos, 25).tramo).toMatchObject({ tipo: 'descanso', ronda: 0, ejercicio: 1 })
    // El descanso después del último de la ronda ya es de la ronda siguiente.
    expect(estadoTabata(tramos, 115).tramo).toMatchObject({ tipo: 'descanso', ronda: 1, ejercicio: 0 })
    expect(estadoTabata(tramos, 470).terminado).toBe(true)
  })

  it('arrancar desde una ronda más adelante', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 4 }, 2, 2)
    expect(tramos[0]).toMatchObject({ ronda: 2, ejercicio: 0, inicio: 0 })
    expect(duracionTabata(tramos)).toBe(4 * 20 + 3 * 10)
  })

  it('rondas completas a los t segundos', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 4 }, 4)
    expect(rondaAlcanzada(tramos, 0)).toBe(0)
    expect(rondaAlcanzada(tramos, 109)).toBe(0)
    expect(rondaAlcanzada(tramos, 110)).toBe(1)
    expect(rondaAlcanzada(tramos, 470)).toBe(4)
    const desde2 = lineaTabata({ trabajo: 20, descanso: 10, rondas: 4 }, 4, 2)
    expect(rondaAlcanzada(desde2, 0, 2)).toBe(2)
    expect(rondaAlcanzada(desde2, 110, 2)).toBe(3)
  })

  it('saltar y anterior', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 2 }, 2)
    expect(tiempoSaltar(tramos, 5)).toBe(20)
    expect(tiempoSaltar(tramos, 22)).toBe(30)
    // A los 10 s del trabajo, vuelve a su principio.
    expect(tiempoAnterior(tramos, 40)).toBe(30)
    // Recién empezado, vuelve al trabajo anterior.
    expect(tiempoAnterior(tramos, 31)).toBe(0)
    // En el descanso, al trabajo que se acaba de hacer.
    expect(tiempoAnterior(tramos, 25)).toBe(0)
    expect(tiempoAnterior(tramos, 1)).toBe(0)
  })

  it('pitidos en 3-2-1, cambio de tramo y final', () => {
    const tramos = lineaTabata({ trabajo: 20, descanso: 10, rondas: 1 }, 2)
    expect(eventosTabata(tramos, 16.8, 17.1)).toEqual([{ tipo: 'cuenta', n: 3 }])
    expect(eventosTabata(tramos, 17.9, 18.2)).toEqual([{ tipo: 'cuenta', n: 2 }])
    expect(eventosTabata(tramos, 18.9, 19.2)).toEqual([{ tipo: 'cuenta', n: 1 }])
    expect(eventosTabata(tramos, 19.9, 20.1)).toEqual([{ tipo: 'tramo', idx: 1 }])
    expect(eventosTabata(tramos, 10, 10.25)).toEqual([])
    expect(eventosTabata(tramos, 49.9, 50.1)).toEqual([{ tipo: 'fin' }])
    expect(eventosTabata(tramos, 50.1, 50.4)).toEqual([])
    // Volvió del segundo plano: nada de ráfagas, sólo lo último.
    expect(eventosTabata(tramos, 2, 18)).toEqual([])
    expect(eventosTabata(tramos, 2, 26)).toEqual([{ tipo: 'tramo', idx: 1 }])
  })
})

describe('marcar las series del tabata', () => {
  const T = 'Tabata 20" / 10" · 4 rondas'
  const rutina = [info('a', T), info('b', T)]

  it('las de las rondas hechas, sin repetir las ya tildadas', () => {
    const ejs = [ej('a', 4, 1), ej('b', 4)]
    const g = agruparEntreno(ejs, rutina)[0].grupos[0]
    expect(seriesDelTabata(ejs, g, 0, 2)).toEqual([
      { exIdx: 1, setIdx: 0 }, { exIdx: 0, setIdx: 1 }, { exIdx: 1, setIdx: 1 },
    ])
    expect(seriesDelTabata(ejs, g, 0, 0)).toEqual([])
  })

  it('si hay más rondas que series, marca las que existen', () => {
    const ejs = [ej('a', 2), ej('b', 4)]
    const g = agruparEntreno(ejs, rutina)[0].grupos[0]
    expect(seriesDelTabata(ejs, g, 2, 4)).toEqual([{ exIdx: 1, setIdx: 2 }, { exIdx: 1, setIdx: 3 }])
  })

  it('qué escribir en las series vacías', () => {
    expect(rellenoTabata({ porTiempo: false, unidad: 'min', reps: '', repsMin: 10, trabajo: 20 })).toEqual({ campo: 'reps', valor: '10' })
    expect(rellenoTabata({ porTiempo: false, unidad: 'min', reps: '12', repsMin: 10, trabajo: 20 })).toBeNull()
    expect(rellenoTabata({ porTiempo: true, unidad: 'seg', duracion: '', reps: '', trabajo: 20 })).toEqual({ campo: 'duration', valor: '20' })
    expect(rellenoTabata({ porTiempo: true, unidad: 'seg', duracion: '25', reps: '', trabajo: 20 })).toBeNull()
    expect(rellenoTabata({ porTiempo: true, unidad: 'min', duracion: '', reps: '', trabajo: 30 })).toEqual({ campo: 'duration', valor: '0.5' })
  })
})
