import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Ensure service worker updates immediately on reload
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Force update check against server on every app launch
  navigator.serviceWorker.ready.then((reg) => {
    reg.update().catch(() => {});
  }).catch(() => {});
}

// Auto update PWA when new version is available
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nueva versión disponible, actualizando...');
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
