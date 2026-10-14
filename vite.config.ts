import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  base: '/gym/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' keeps new assets downloading in the background (the SW still
      // precaches them on every visit) but lets the user choose when to apply
      // the update via a toast, instead of a surprise auto-reload that could
      // interrupt an in-progress workout.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'GymPro',
        short_name: 'GymPro',
        description: 'Tu compañero de entrenamiento definitivo',
        theme_color: '#0C0E14',
        background_color: '#0C0E14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/gym/',
        scope: '/gym/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // El maskable va aparte: lleva la marca al 62% para que entre en la
          // zona segura que recorta Android, y fondo a sangre sin squircle.
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
