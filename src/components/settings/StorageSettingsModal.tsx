import React, { useState } from 'react';
import {
  X,
  Cloud,
  HardDrive,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Key,
  LogOut,
  FolderSync,
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
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const handleSaveMode = (newMode: StorageMode) => {
    setStorageMode(newMode);
    googleDriveService.saveConfig({ storageMode: newMode });
    setStatusMessage({ type: 'success', text: 'Modo de almacenamiento actualizado.' });
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    googleDriveService.saveConfig({ clientId: clientId.trim() });
    setStatusMessage({ type: 'success', text: 'Client ID guardado correctamente.' });
  };

  const handleConnect = async () => {
    const cleanId = clientId.replace(/\s+/g, '');
    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Introduce primero tu Google Client ID.' });
      return;
    }

    if (!cleanId.endsWith('.apps.googleusercontent.com')) {
      setStatusMessage({
        type: 'error',
        text: 'El Client ID parece incompleto o erróneo. Debe terminar exactamente en .apps.googleusercontent.com (comprueba que no se haya cortado al copiarlo al móvil).',
      });
      return;
    }

    googleDriveService.saveConfig({ clientId: cleanId });
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const res = await googleDriveService.login();
      setIsConnected(true);
      setUserEmail(res.email);
      setStatusMessage({ type: 'success', text: `Conectado exitosamente como ${res.email}` });

      // Automatically sync on login
      const syncRes = await googleDriveService.sync();
      setLastSyncTime(new Date().toISOString());
      if (syncRes.imported > 0) {
        setStatusMessage({
          type: 'success',
          text: `Sincronizado con Google Drive: ${syncRes.imported} recetas recuperadas.`,
        });
      }
      onSyncComplete?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al conectar con Google: ' + (err.message || 'error') });
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
      setStatusMessage({
        type: 'success',
        text: `Sincronización completa con Google Drive (${syncRes.imported} recetas nuevas fusionadas).`,
      });
      onSyncComplete?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al sincronizar: ' + (err.message || 'error') });
    } finally {
      setIsSyncing(false);
    }
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
              <p className="text-[11px] text-neutral-500">Sincronización multidispositivo PC &harr; Móvil</p>
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
            ¿Dónde quieres guardar tus recetas?
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
                Tus recetas viven directamente en tu Google Drive. Cualquier cambio en el PC o en el móvil se refleja al instante.
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
                <span>Híbrido (Local + Copia automática en Drive)</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Guarda en el dispositivo para cocinar 100% sin conexión y mantiene una copia sincronizada en Drive cuando hay internet.
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
                Almacenamiento exclusivo en el navegador de tu dispositivo. Copias manuales con archivo ZIP.
              </p>
            </div>
          </label>
        </div>

        {/* 2. Tarjeta de Conexión con Google Drive */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" />
              Cuenta de Google Drive
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

          {/* Connected User Profile Info */}
          {isConnected && (
            <div className="p-3 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-neutral-800 truncate">{userEmail || 'Cuenta de Google'}</p>
                {lastSyncTime && (
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Última sincronización: {new Date(lastSyncTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Desconectar cuenta"
                  className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Client ID Configuration Input */}
          <form onSubmit={handleSaveClientId} className="space-y-2">
            <label className="block text-[11px] font-semibold text-neutral-600">
              Google Client ID de tu proyecto OAuth
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value.replace(/\s+/g, ''))}
                placeholder="123456789-xxxx.apps.googleusercontent.com"
                className="flex-1 px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 font-mono outline-hidden focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl transition"
              >
                Guardar ID
              </button>
            </div>

            {clientId && !clientId.endsWith('.apps.googleusercontent.com') && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl">
                ⚠️ <strong>Aviso:</strong> El ID parece incompleto. Un Client ID de Google debe terminar obligatoriamente en <code className="font-mono font-bold">.apps.googleusercontent.com</code>. Revisa que no se haya cortado al copiarlo al móvil.
              </p>
            )}
          </form>

          {/* Connect Button if not connected */}
          {!isConnected && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isSyncing || !clientId.trim()}
              className="w-full py-3 bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 font-bold text-xs rounded-2xl border border-neutral-300 shadow-2xs transition flex items-center justify-center gap-2 active:scale-95"
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
                  <span>Iniciar sesión y conectar con Google Drive</span>
                </>
              )}
            </button>
          )}

          {/* Help Accordion to get Client ID */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-amber-800 hover:text-amber-900"
            >
              <span>¿Cómo obtener tu Google Client ID gratis en 4 pasos?</span>
              {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHelp && (
              <div className="mt-2.5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-950 space-y-2 leading-relaxed">
                <p className="font-bold">Pasos en Google Cloud Console (3 minutos):</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-700">
                  <li>
                    Entra en{' '}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 font-bold underline inline-flex items-center gap-0.5"
                    >
                      console.cloud.google.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    con tu cuenta de Gmail y crea un nuevo proyecto llamado <em>"Mi Recetario"</em>.
                  </li>
                  <li>
                    En <strong>APIs y servicios &rarr; Biblioteca</strong>, busca <strong>Google Drive API</strong> y pulsa <strong>Habilitar</strong>.
                  </li>
                  <li>
                    En <strong>Pantalla de consentimiento de OAuth</strong>, elige tipo <em>Externo</em>, pon nombre "Mi Recetario" y tu correo.
                  </li>
                  <li>
                    En <strong>Credenciales &rarr; Crear credenciales &rarr; ID de cliente de OAuth</strong>:
                    <ul className="list-disc list-inside ml-3 mt-1 text-neutral-600">
                      <li>Tipo de aplicación: <strong>Aplicación web</strong>.</li>
                      <li>Orígenes de JavaScript autorizados: pon <code>http://localhost:5173</code> y <code>https://nophos79.github.io</code>.</li>
                    </ul>
                  </li>
                </ol>
                <p className="text-neutral-500 pt-1">
                  Copia el <strong>ID de cliente</strong> resultante (termina en <code>.apps.googleusercontent.com</code>) y pégalo arriba.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
