/**
 * Test shim for '@deepseek-ai/dsh-client-runtime/client': the installed
 * package's ./client is the browser bundle (window.__ModuleLoader__), which
 * cannot load under vitest. This minimal engine implements the same
 * StoreHandle contract (init/actions/create) with plain snapshots.
 */
import type {
  ActionsDecl, BakedActions, StoreHandle, StoreInstance, StoreSpec,
} from '@deepseek-ai/dsh-client-ui-slots'

/** Engine handle: StoreHandle with the runtime's extra engine surface omitted. */
export interface EngineStoreHandle<T, A extends ActionsDecl<T>> extends StoreHandle<T, A> {}

/** Engine instance: the plain StoreInstance. */
export type EngineStoreInstance<T, A extends ActionsDecl<T>> = StoreInstance<T, A>

/**
 * Declare a store: init + actions in, handle out (spec kept for the
 * framework).
 * @param decl - store spec.
 * @returns the store handle.
 */
export function defineStore<T, A extends ActionsDecl<T>>(decl: StoreSpec<T, A>): EngineStoreHandle<T, A> {
  return {
    spec: decl,
    create(scopeKey?: string): EngineStoreInstance<T, A> {
      void scopeKey
      let state: T = decl.init()
      const listeners = new Set<() => void>()
      const actions = {} as Record<string, (...params: unknown[]) => void>
      for (const key of Object.keys(decl.actions)) {
        const mutate = (decl.actions as Record<string, (draft: T, ...params: unknown[]) => void>)[key] as
          (draft: T, ...params: unknown[]) => void
        actions[key] = (...params: unknown[]) => {
          const next = JSON.parse(JSON.stringify(state)) as T
          mutate(next, ...params)
          state = next
          for (const fn of [...listeners]) fn()
        }
      }
      return {
        actions: actions as BakedActions<T, A>,
        getSnapshot: () => state,
        subscribe: (fn: () => void) => {
          listeners.add(fn)
          return () => { listeners.delete(fn) }
        },
        clearPersisted: () => {},
      }
    },
  }
}
