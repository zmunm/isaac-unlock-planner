import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // pnpm dev serves only the UI — /api is proxied to wrangler dev (8787)
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { include: ['worker/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'] },
})
