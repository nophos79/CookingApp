import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// App Build Version identifier for cache invalidation
const APP_BUILD_VERSION = '2026.11.23-pwa-v4';
const VERSION_KEY = 'cooking_app_build_version';

try {
  const previousVersion = localStorage.getItem(VERSION_KEY);
  if (previousVersion !== APP_BUILD_VERSION) {
    localStorage.setItem(VERSION_KEY, APP_BUILD_VERSION);
    // Automatically purge old caches on version bump
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((name) => {
          caches.delete(name).catch(() => {});
        });
      });
    }
  }
} catch {
  // Ignore storage errors in private browsing
}

// Ensure service worker updates immediately on reload
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Force update check on load
  navigator.serviceWorker.ready.then((reg) => {
    reg.update().catch(() => {});
  }).catch(() => {});
}

// Auto update PWA when new version is available
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nueva versión disponible, actualizando Service Worker...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('PWA lista para funcionar sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
