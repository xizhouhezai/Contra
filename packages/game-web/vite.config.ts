import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const resolveFrom = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url))

/**
 * The workspace packages ship compiled `dist` output, but the dev server and the
 * game build both read straight from source so a fresh clone runs without a
 * prior build (docs/game/design/architecture.md §技术选型).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@contra/game-core': resolveFrom('../game-core/src/index.ts'),
      '@contra/game-platform': resolveFrom('../game-platform/src/index.ts'),
    },
  },
  server: { port: 4173, strictPort: true },
  build: { target: 'es2022', outDir: 'dist', sourcemap: true },
})
