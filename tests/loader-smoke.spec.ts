/**
 * Loader-handoff smoke over the BUILT client artifact: execute lib/client.js
 * exactly like the web shell would (window.__ModuleLoader__.load capture,
 * module-table requires for the platform externals) and assert the factory
 * exports the cordis plugin face.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import * as runtimeShim from './shims/runtime-client.ts'

interface LoadRecord {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

const clientPath = resolve(process.cwd(), 'lib/client.js')

describe('built client bundle loader handoff', () => {
  it('registers under the plugin id and exports the cordis face', () => {
    const source = readFileSync(clientPath, 'utf8')
    let record: LoadRecord | undefined
    const sandbox = {
      window: {
        __ModuleLoader__: {
          load: (rec: LoadRecord) => { record = rec },
        },
      },
      console,
    }
    vm.runInNewContext(source, sandbox, { filename: 'lib/client.js' })
    expect(record).toBeDefined()
    expect(record?.id).toBe('dsh-ui-attention')
    const moduleTable: Record<string, unknown> = {
      'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}), Fragment: {} },
      react: { createElement: () => ({}), Fragment: {} },
      'react-dom': { createPortal: (node: unknown) => node },
      '@deepseek-ai/dsh-client-runtime/client': {
        defineStore: runtimeShim.defineStore,
        createSnapshotStore: runtimeShim.defineStore,
      },
    }
    const exports = record?.factory((spec: string) => {
      const hit = moduleTable[spec]
      if (hit === undefined) throw new Error(`unexpected require in client bundle: ${spec}`)
      return hit
    })
    expect(exports).toBeDefined()
    expect(exports?.inject).toEqual(['slots', 'locale', 'sessions'])
    expect(typeof exports?.apply).toBe('function')
  })
})
