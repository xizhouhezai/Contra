import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const resolveFrom = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url))

/** Node-only tests: they cover the event bridge, never Phaser's renderer. */
export default defineConfig({
  resolve: {
    alias: {
      '@contra/game-core': resolveFrom('../game-core/src/index.ts'),
      '@contra/game-platform': resolveFrom('../game-platform/src/index.ts'),
    },
  },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
})
