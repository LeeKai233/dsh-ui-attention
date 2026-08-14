import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The installed package's ./client is the browser bundle (window.__ModuleLoader__);
      // tests load the local engine shim instead.
      '@deepseek-ai/dsh-client-runtime/client': fileURLToPath(new URL('./tests/shims/runtime-client.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.{ts,tsx}'],
    passWithNoTests: true,
  },
})
