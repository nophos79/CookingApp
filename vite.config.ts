import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/CookingApp/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon-48x48.png',
        'favicon-32x32.png',
        'favicon-16x16.png',
        'apple-touch-icon.png',
        'pwa-apple-touch-icon.png',
        'icon-192.svg',
        'icon-512.svg',
        'icon-192.png',
        'icon-512.png',
        'pwa-icon-192.png',
        'pwa-icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
        'pwa-maskable-192.png',
        'pwa-maskable-512.png',
        'icon-maskable.svg',
      ],
      manifest: {
        id: '/CookingApp/?app=v2',
        name: 'Mi Recetario',
        short_name: 'Mi Recetario',
        description: 'Tu recetario personal, privado y sin conexión. Cocina cómodamente desde el móvil.',
        theme_color: '#ea580c',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es',
        start_url: '/CookingApp/?app=v2',
        scope: '/CookingApp/',
        icons: [
          {
            src: 'pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        share_target: {
          action: '/CookingApp/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
