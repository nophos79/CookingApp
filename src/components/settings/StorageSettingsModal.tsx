import React, { useState } from 'react';
import {
  X,
  Cloud,
  HardDrive,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
  LogOut,
  FolderSync,
  Mail,
  Sliders,
} from 'lucide-react';
import { googleDriveService } from '../../services/drive/googleDriveService';
import type { StorageMode } from '../../services/drive/driveTypes';

interface StorageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const StorageSettingsModal: React.FC<StorageSettingsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const currentConfig = googleDriveService.getConfig();

  const [storageMode, setStorageMode] = useState<StorageMode>(currentConfig.storageMode || 'local-only');
  const [clientId, setClientId] = useState(currentConfig.clientId || '');
  const [userEmail, setUserEmail] = useState(currentConfig.userEmail || '');
  const [lastSyncTime, setLastSyncTime] = useState(currentConfig.lastSyncTime || '');
  const [isConnected, setIsConnected] = useState(googleDriveService.isConnected());

  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveMode = (newMode: StorageMode) => {
    setStorageMode(newMode);
    googleDriveService.saveConfig({ storageMode: newMode });
    setStatusMessage({ type: 'success', text: 'Modo de almacenamiento actualizado.' });
  };

  const handleConnect = async () => {
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      // Login with optional email hint
      const emailToUse = userEmail.trim();
      const res = await googleDriveService.login(emailToUse || undefined);
      setIsConnected(true);
      setUserEmail(res.email);
      setStatusMessage({ type: 'success', text: `Conectado exitosamente con ${res.email}` });

      // If user was in local-only mode, automatically activate hybrid mode
      if (storageMode === 'local-only') {
        setStorageMode('hybrid');
        googleDriveService.saveConfig({ storageMode: 'hybrid' });
      }

      // Automatically sync on login
      const syncRes = await googleDriveService.sync();
      setLastSyncTime(new Date().toISOString());
      if (syncRes.imported > 0 || syncRes.updated > 0) {
        const parts: string[] = [];
        if (syncRes.imported > 0) parts.push(`${syncRes.imported} nuevas`);
        if (syncRes.updated > 0) parts.push(`${syncRes.updated} actualizadas`);
        setStatusMessage({
          type: 'success',
          text: `Sincronizado con Google Drive: ${parts.join(', ')}.`,
        });
      }
      onSyncComplete?.();
    } catch (err: any) {
      console.error('Error al conectar con Google:', err);
      const msg = err?.message || 'Error al iniciar sesión con Google';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    googleDriveService.logout();
    setIsConnected(false);
    setUserEmail('');
    setStatusMessage({ type: 'success', text: 'Sesión de Google Drive desconectada.' });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const syncRes = await googleDriveService.sync();
      setLastSyncTime(new Date().toISOString());
      const parts: string[] = [];
      if (syncRes.imported > 0) parts.push(`${syncRes.imported} nuevas`);
      if (syncRes.updated > 0) parts.push(`${syncRes.updated} actualizadas`);
      const details = parts.length > 0 ? ` (${parts.join(', ')})` : ' (todo al día)';

      setStatusMessage({
        type: 'success',
        text: `Sincronización completa con Google Drive${details}.`,
      });
      onSyncComplete?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al sincronizar: ' + (err.message || 'error') });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    googleDriveService.saveConfig({ clientId: clientId.trim() });
    setStatusMessage({ type: 'success', text: 'Client ID personalizado guardado.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Almacenamiento y Google Drive</h3>
              <p className="text-[11px] text-neutral-500">Sincronización en la nube multidispositivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Selector de Modo de Almacenamiento */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
            ¿Dónde guardar tus recetas?
          </label>

          {/* Option A: Solo Google Drive */}
          <label
            onClick={() => handleSaveMode('drive-only')}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
              storageMode === 'drive-only'
                ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <input
              type="radio"
              name="storageMode"
              checked={storageMode === 'drive-only'}
              onChange={() => handleSaveMode('drive-only')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-900">
                <Cloud className="w-4 h-4 text-amber-600" />
                <span>Solo Google Drive (Nube principal)</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Tus recetas se sincronizan en tu Google Drive. Cualquier cambio en PC o móvil se actualiza de inmediato.
              </p>
            </div>
          </label>

          {/* Option B: Híbrido (Local + Drive) */}
          <label
            onClick={() => handleSaveMode('hybrid')}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
              storageMode === 'hybrid'
                ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <input
              type="radio"
              name="storageMode"
              checked={storageMode === 'hybrid'}
              onChange={() => handleSaveMode('hybrid')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-900">
                <FolderSync className="w-4 h-4 text-amber-600" />
                <span>Híbrido (Local + Copia en Google Drive)</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Disponible 100% offline para cocinar sin conexión y sincronizado con Drive cuando tengas internet.
              </p>
            </div>
          </label>

          {/* Option C: Solo Local */}
          <label
            onClick={() => handleSaveMode('local-only')}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
              storageMode === 'local-only'
                ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <input
              type="radio"
              name="storageMode"
              checked={storageMode === 'local-only'}
              onChange={() => handleSaveMode('local-only')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-900">
                <HardDrive className="w-4 h-4 text-amber-600" />
                <span>Solo Local (Sin cuenta en la nube)</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Almacenamiento exclusivo en el dispositivo. Las copias de seguridad son mediante archivo ZIP.
              </p>
            </div>
          </label>
        </div>

        {/* 2. Tarjeta de Integración con Google */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-amber-600" />
              Cuenta de Google
            </span>

            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400 font-medium">No conectado</span>
            )}
          </div>

          {/* Connected view */}
          {isConnected ? (
            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                    {userEmail ? userEmail.charAt(0) : 'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-neutral-800 truncate">
                      {userEmail || 'Cuenta de Google'}
                    </p>
                    {lastSyncTime ? (
                      <p className="text-[10px] text-neutral-400">
                        Última sincronización: {new Date(lastSyncTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <p className="text-[10px] text-neutral-400">Listo para sincronizar</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Cerrar sesión de Google"
                  className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-neutral-100 transition shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
              </button>
            </div>
          ) : (
            /* Disconnected view: Solo pide correo y botón Conectar con Google */
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Correo electrónico de Google</span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value.trim())}
                  placeholder="tu.correo@gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-neutral-300 outline-hidden focus:border-amber-500 text-neutral-800"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Introduce tu correo o déjalo vacío para seleccionarlo en la ventana de Google.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnect}
                disabled={isSyncing}
                className="w-full py-3 bg-white hover:bg-neutral-50 active:scale-[0.99] border border-neutral-300 rounded-2xl shadow-xs flex items-center justify-center gap-2.5 font-bold text-xs text-neutral-800 transition"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Conectar con Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Opciones avanzadas de desarrollador (colapsadas, no visibles para usuarios normales) */}
          <details className="pt-2 border-t border-neutral-200/60 group">
            <summary className="text-[11px] text-neutral-400 hover:text-neutral-600 font-medium cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-neutral-400" />
                <span>Opciones avanzadas (Client ID personalizado)</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="mt-2.5 pt-2 space-y-2 text-xs">
              <form onSubmit={handleSaveCustomClientId} className="space-y-2">
                <label className="block text-[10px] text-neutral-500 font-semibold">
                  Google Client ID personalizado (opcional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Predeterminado de la aplicación"
                    className="flex-1 px-2.5 py-1.5 text-[11px] bg-white rounded-lg border border-neutral-300 font-mono outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-[11px] rounded-lg transition"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
