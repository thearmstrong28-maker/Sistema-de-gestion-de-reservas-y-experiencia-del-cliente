import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Target del proxy: en Docker se pasa VITE_PROXY_TARGET=http://backend:3000
// En desarrollo local se usa http://localhost:3000 por defecto
const apiTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000'

const proxiedRoutes = [
  '/auth',
  '/users',
  '/establishment',
  '/reports',
  '/customers',
  '/reservations',
  '/shifts',
  '/waitlist',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: Object.fromEntries(
      proxiedRoutes.map((route) => [
        route,
        {
          target: apiTarget,
          changeOrigin: true,
        },
      ]),
    ),
  },
})
