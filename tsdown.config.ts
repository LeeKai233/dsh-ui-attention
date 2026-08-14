/**
 * Standalone tsdown config for the out-of-tree dsh-ui-attention plugin.
 * Mirrors the harness repo's packages/client/tsdown.client.ts essentials:
 * the node half is a plain ESM lib, the client half is a CJS bundle wrapped
 * in window.__ModuleLoader__.load({id, factory}) with the platform modules
 * (and the documented runtime-store exemption) left external.
 */
import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'dsh-ui-attention'

/** The module specifiers the web shell shares into the frozen module table. */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

/** Documented exemption: snapshot-store engine answered by the lazy runtime table. */
const RUNTIME_STORE_EXEMPTION = '@deepseek-ai/dsh-client-runtime/client'

/** Host node-half dependencies resolved through the profile flat fallback. */
const NODE_EXTERNALS = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-settings', '@deepseek-ai/schemastery']

export default defineConfig([
  {
    name: PLUGIN_ID,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: false,
    fixedExtension: false,
    clean: false,
    external: NODE_EXTERNALS,
  },
  {
    name: PLUGIN_ID + '/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...PLATFORM_MODULES, RUNTIME_STORE_EXEMPTION],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(PLUGIN_ID) + ', factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
