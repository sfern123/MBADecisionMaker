import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` is set from an env var so the same build works both locally and on
// GitHub Pages (where the app is served from /<repo-name>/).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5199, strictPort: true },
})
