import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'PennyFlow — Finanzas Personales',
        short_name: 'PennyFlow',
        description: 'Gestiona tus gastos e ingresos con total privacidad. Todo se procesa localmente en tu dispositivo.',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        dir: 'ltr',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshots/mobile-1.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Dashboard principal'
          },
          {
            src: '/screenshots/mobile-2.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Estadísticas'
          },
          {
            src: '/screenshots/desktop-1.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Vista de escritorio'
          }
        ],
        shortcuts: [
          {
            name: 'Añadir gasto',
            short_name: 'Gasto',
            description: 'Registrar un nuevo gasto rápidamente',
            url: '/?action=add-expense',
            icons: [{ src: '/icons/shortcut-expense.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Añadir ingreso',
            short_name: 'Ingreso',
            description: 'Registrar un nuevo ingreso rápidamente',
            url: '/?action=add-income',
            icons: [{ src: '/icons/shortcut-income.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Estadísticas',
            short_name: 'Stats',
            description: 'Ver tus estadísticas financieras',
            url: '/statistics',
            icons: [{ src: '/icons/shortcut-stats.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ],
        additionalManifestEntries: undefined
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'animation-vendor': ['framer-motion'],
          'db-vendor': ['dexie', 'dexie-react-hooks']
        }
      }
    }
  }
});
