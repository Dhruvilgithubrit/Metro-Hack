import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Cache all data files and assets
        globPatterns: ['**/*.{js,css,html,ico,svg,png,json,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'metro-data',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Metro Triage Desk',
        short_name: 'Triage Desk',
        description: 'Gujarat Metro complaint triage tool for station controllers',
        theme_color: '#e8590c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
