import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * Almacenamiento de los stores persistidos, con tres cuidados que el
 * `createJSONStorage` de zustand no tiene:
 *
 * 1. No reescribe lo que no cambió. El middleware de persist escribe el estado
 *    entero en cada `set()`, aunque lo que cambie sea la pestaña o un aviso
 *    (que no se guardan). Con años de historial eso era serializar cientos de
 *    KB por toque. Si todas las claves guardadas son las mismas referencias que
 *    la última vez, no se hace nada; si cambiaron pero el JSON da igual, tampoco
 *    se escribe.
 * 2. No revienta si el almacenamiento se llena. `localStorage.setItem` tira
 *    `QuotaExceededError`, y como persist escribe dentro del `set()`, la
 *    excepción cortaba a la mitad la acción que estaba corriendo (terminar un
 *    entreno quedaba a medias y se duplicaba al reintentar). Ahora se avisa y
 *    los datos siguen en memoria, listos para exportar.
 * 3. Se puede pausar. Al importar un backup se escribe el archivo y se recarga
 *    la página; si en el medio el store guardaba su estado viejo (un aviso que
 *    se cierra), pisaba el backup recién importado.
 */

type Listener = (error: unknown) => void

let pausado = false
let alFallar: Listener | null = null
let falloPendiente = false

/** Corta todas las escrituras hasta que la página se recargue. */
export function pausarEscrituras(): void {
  pausado = true
}

/** Vuelve a habilitar las escrituras (si el import falló a mitad de camino). */
export function reanudarEscrituras(): void {
  pausado = false
}

/** Quién se entera cuando una escritura falla (el aviso de "sin espacio"). */
export function alFallarEscritura(listener: Listener): void {
  alFallar = listener
}

/** true si la última escritura no se pudo hacer. */
export function huboFalloDeEscritura(): boolean {
  return falloPendiente
}

export function createSafeStorage<S>(): PersistStorage<S> {
  let ultimoEstado: Record<string, unknown> | null = null
  let ultimoJson: string | null = null

  const mismasReferencias = (estado: Record<string, unknown>): boolean => {
    if (!ultimoEstado) return false
    const claves = Object.keys(estado)
    if (claves.length !== Object.keys(ultimoEstado).length) return false
    return claves.every((k) => Object.is(estado[k], ultimoEstado![k]))
  }

  return {
    getItem: (name) => {
      let raw: string | null
      try {
        raw = localStorage.getItem(name)
      } catch {
        return null
      }
      if (raw == null) return null
      try {
        const parsed = JSON.parse(raw) as StorageValue<S>
        ultimoJson = raw
        ultimoEstado = null
        return parsed
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      if (pausado) return
      const estado = (value.state ?? {}) as Record<string, unknown>
      if (mismasReferencias(estado)) return
      const json = JSON.stringify(value)
      ultimoEstado = { ...estado }
      if (json === ultimoJson) return
      try {
        localStorage.setItem(name, json)
        ultimoJson = json
        falloPendiente = false
      } catch (error) {
        // Sin ultimoJson nuevo: la próxima escritura lo vuelve a intentar.
        ultimoEstado = null
        falloPendiente = true
        alFallar?.(error)
      }
    },
    removeItem: (name) => {
      ultimoEstado = null
      ultimoJson = null
      try {
        localStorage.removeItem(name)
      } catch {
        // nada que hacer
      }
    },
  }
}
