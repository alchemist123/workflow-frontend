import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on every interface. Without this Vite binds IPv6 localhost only,
    // so http://localhost:5173 works while http://127.0.0.1:5173 is refused —
    // which reads as the dev server being down rather than unreachable on one
    // address.
    host: true,
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
})
