/** T13: build-artifact smoke — node half importable, client bundle wrapped and externalized. */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest runs with cwd = package root; import.meta.url is not a file URL here.
const libDir = resolve(process.cwd(), 'lib')
const clientPath = resolve(libDir, 'client.js')

describe('build artifacts', () => {
  it('emits the node half as an ESM lib exporting inject/apply', async () => {
    const indexPath = resolve(libDir, 'index.js')
    expect(existsSync(indexPath)).toBe(true)
    const mod = await import(indexPath) as { apply: unknown; inject: unknown }
    expect(typeof mod.apply).toBe('function')
    expect(Array.isArray(mod.inject)).toBe(true)
  })

  it('wraps the client bundle in the module-loader handoff', () => {
    expect(existsSync(clientPath)).toBe(true)
    const source = readFileSync(clientPath, 'utf8')
    expect(source).toContain('window.__ModuleLoader__.load')
    expect(source).toContain('dsh-ui-attention')
    expect(source).toContain('return module.exports')
  })

  it('keeps platform modules and the runtime-store exemption external', () => {
    const source = readFileSync(clientPath, 'utf8')
    for (const spec of ['react/jsx-runtime', '@deepseek-ai/dsh-client-runtime/client']) {
      const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(new RegExp(`require\\([\"']${escaped}[\"']\\)`).test(source)).toBe(true)
    }
  })
})
