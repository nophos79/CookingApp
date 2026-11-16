import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed prompt today
      const dismissed = localStorage.getItem('mi_recetario_pwa_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('mi_recetario_pwa_dismissed', 'true');
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-md mx-auto z-40 bg-neutral-900 text-white p-3.5 rounded-2xl shadow-2xl border border-neutral-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm truncate">Instala Mi Recetario</p>
          <p className="text-[11px] text-neutral-400 truncate">
            Acceso rápido y funcionamiento 100% sin conexión
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
