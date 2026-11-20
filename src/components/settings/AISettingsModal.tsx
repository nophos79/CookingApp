import React, { useState } from 'react';
import { X, Sparkles, Key, Check, ShieldCheck, ExternalLink, Cpu, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { aiService } from '../../services/ai/aiService';
import type { AIProviderType, AISettings } from '../../services/ai/aiTypes';
import { testGeminiApiKey, getActiveGeminiModel, setActiveGeminiModel, fetchAvailableGeminiModels } from '../../services/ai/geminiProvider';
import { forceAppUpdate } from '../../utils/pwaUpdate';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const currentSettings = aiService.getSettings();
  const [provider, setProvider] = useState<AIProviderType>(
    currentSettings.geminiApiKey?.trim() ? 'gemini' : (currentSettings.provider || 'heuristic')
  );
  const [geminiApiKey, setGeminiApiKey] = useState(currentSettings.geminiApiKey || '');

  // Model selection state
  const [availableModelsList, setAvailableModelsList] = useState<string[]>([
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
  ]);
  const initialModel = currentSettings.geminiModel || 'auto';
  const [geminiModel, setGeminiModel] = useState<string>(initialModel);
  const [customModel, setCustomModel] = useState<string>(
    ['auto', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'].includes(initialModel) ? '' : initialModel
  );
  const [activeModelName, setActiveModelName] = useState<string>(
    initialModel !== 'auto' && initialModel !== 'custom'
      ? initialModel
      : getActiveGeminiModel()
  );

  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Discover actual available models for this user's API key
  React.useEffect(() => {
    if (geminiApiKey.trim()) {
      fetchAvailableGeminiModels(geminiApiKey.trim()).then((models) => {
        if (models && models.length > 0) {
          setAvailableModelsList(models);
        }
      });
    }
  }, [geminiApiKey]);

  if (!isOpen) return null;

  const handleModelChange = (newModel: string) => {
    setGeminiModel(newModel);
    setTestResult(null);
    if (newModel === 'auto') {
      setActiveGeminiModel(null);
      setActiveModelName(getActiveGeminiModel());
    } else if (newModel === 'custom') {
      const custom = customModel.trim();
      setActiveGeminiModel(custom || null);
      setActiveModelName(custom || 'personalizado');
    } else {
      setActiveGeminiModel(newModel);
      setActiveModelName(newModel);
    }
  };

  const handleCustomModelChange = (val: string) => {
    setCustomModel(val);
    setTestResult(null);
    if (geminiModel === 'custom') {
      const clean = val.trim();
      setActiveGeminiModel(clean || null);
      setActiveModelName(clean || 'personalizado');
    }
  };

  const handleTestKey = async () => {
    if (!geminiApiKey.trim()) {
      setTestResult({ ok: false, message: 'Introduce una clave API para probar.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const selectedOrCustom = geminiModel === 'custom' ? (customModel.trim() || 'gemini-2.0-flash') : geminiModel;
      const verifiedModel = await testGeminiApiKey(geminiApiKey.trim(), selectedOrCustom);
      setActiveModelName(verifiedModel);
      setActiveGeminiModel(verifiedModel);

      const liveModels = await fetchAvailableGeminiModels(geminiApiKey.trim());
      if (liveModels && liveModels.length > 0) {
        setAvailableModelsList(liveModels);
      }

      setTestResult({ ok: true, message: `¡Conexión verificada con éxito con ${verifiedModel}!` });
      setProvider('gemini');
    } catch (err: any) {
      setTestResult({ ok: false, message: 'Error de validación: ' + (err.message || 'clave inválida') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = geminiApiKey.trim();
    const effectiveModel = geminiModel === 'custom' ? (customModel.trim() || undefined) : (geminiModel === 'auto' ? undefined : geminiModel);

    // Immediately sync active model into memory
    setActiveGeminiModel(effectiveModel || null);

    const newSettings: AISettings = {
      provider: cleanKey ? 'gemini' : provider,
      geminiApiKey: cleanKey || undefined,
      geminiModel: effectiveModel,
    };
    aiService.saveSettings(newSettings);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Configuración de Asistente e IA</h3>
              <p className="text-[11px] text-neutral-500">Módulo modular de estructuración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Motor de extracción
            </label>

            {/* Option 1: Heuristic (Free, No Key) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                provider === 'heuristic'
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                checked={provider === 'heuristic'}
                onChange={() => setProvider('heuristic')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-900">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span>Reglas locales (Sin IA ni claves)</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  100% gratuito y sin internet. Adecuado para estructurar texto pegado o fotografías escaneadas. No apto para investigar enlaces de vídeo sin texto.
                </p>
              </div>
            </label>

            {/* Option 2: Google Gemini (Free Tier API Key) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                provider === 'gemini'
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                checked={provider === 'gemini'}
                onChange={() => setProvider('gemini')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Google Gemini AI (Recomendado)</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Estructuración inteligente y extracción automática de ingredientes y pasos a partir de enlaces de YouTube o recetas web.
                </p>
              </div>
            </label>
          </div>

          {/* Gemini Settings Card */}
          {(provider === 'gemini' || !!geminiApiKey) && (
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3 animate-in fade-in">
              {/* Clave API */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" /> Clave API de Gemini
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-700 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <span>Obtener clave gratis</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      if (e.target.value.trim()) {
                        setProvider('gemini');
                      }
                      setTestResult(null);
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTesting || !geminiApiKey.trim()}
                    className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 disabled:opacity-40 text-neutral-800 text-xs font-semibold rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Probar</span>
                  </button>
                </div>
              </div>

              {/* Selector de Modelo y Estado Actual */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-200/60">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-amber-600" /> Modelo de Gemini
                  </span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    Activo: <strong className="text-amber-800 font-mono">
                      {geminiModel === 'auto'
                        ? `Auto (${activeModelName})`
                        : activeModelName}
                    </strong>
                  </span>
                </div>

                <select
                  value={geminiModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:border-amber-500 outline-hidden font-medium text-neutral-800"
                >
                  <option value="auto">Automático (Recomendado - Selección óptima y sin cortes)</option>
                  {availableModelsList.map((m) => (
                    <option key={m} value={m}>
                      {m === 'gemini-2.0-flash'
                        ? 'Gemini 2.0 Flash (Recomendado, gran velocidad)'
                        : m === 'gemini-2.0-flash-lite'
                        ? 'Gemini 2.0 Flash-Lite (Ultrarrápido, inmune a saturación)'
                        : m === 'gemini-1.5-pro'
                        ? 'Gemini 1.5 Pro (Alta capacidad analítica)'
                        : m}
                    </option>
                  ))}
                  <option value="custom">Otro modelo personalizado...</option>
                </select>

                {geminiModel === 'custom' && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => handleCustomModelChange(e.target.value)}
                    placeholder="Escribe el nombre del modelo (ej: gemini-2.0-flash-lite)"
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-neutral-300 font-mono outline-hidden mt-1"
                  />
                )}

                <p className="text-[10px] text-neutral-400">
                  El modo automático selecciona el modelo más rápido de tu cuenta y cambia de forma transparente si Google sufre picos de saturación.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                    testResult.ok
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {testResult.ok ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-start gap-1.5 text-[11px] text-neutral-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Tu clave se guarda únicamente en tu dispositivo local. Nunca se comparte.</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? 'Guardado' : 'Guardar Preferencias'}</span>
            </button>
          </div>

          {/* Force Cache Refresh Button */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Versión de la app</span>
            <button
              type="button"
              onClick={() => forceAppUpdate()}
              className="flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold hover:underline"
              title="Borra la caché del Service Worker y recarga la última versión"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Forzar actualización</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
