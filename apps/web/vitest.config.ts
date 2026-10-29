import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Unit tests import server modules directly.
    alias: { 'server-only': fileURLToPath(new URL('./tests/empty.ts', import.meta.url)) },
  },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
})
