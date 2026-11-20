import React, { useState, useRef } from 'react';
import {
  Link as LinkIcon,
  Camera,
  PenTool,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Settings,
  HelpCircle,
  Video,
} from 'lucide-react';
import type { Category, Recipe } from '../../types/recipe';
import { scrapeUrlMetadata, type ScrapedUrlMetadata } from '../../services/scraper/urlScraper';
import { aiService } from '../../services/ai/aiService';
import { recognizeTextFromImage, type OCRProgress } from '../../services/ocr/ocrService';
import { processAndCompressImage } from '../../services/imageStorage';
import { AISettingsModal } from '../settings/AISettingsModal';
import { forceAppUpdate } from '../../utils/pwaUpdate';

type ImportTab = 'url' | 'photo' | 'manual';

interface ImportHubProps {
  categories: Category[];
  initialUrl?: string;
  initialText?: string;
  onStartManual: () => void;
  onReviewImportedRecipe: (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const ImportHub: React.FC<ImportHubProps> = ({
  categories,
  initialUrl = '',
  initialText = '',
  onStartManual,
  onReviewImportedRecipe,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // URL Import State
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [scrapedMeta, setScrapedMeta] = useState<ScrapedUrlMetadata | null>(null);
  const [transcriptText, setTranscriptText] = useState(initialText);
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Auto-analyze URL if arrived via Web Share Target
  React.useEffect(() => {
    if (initialUrl && !scrapedMeta) {
      scrapeUrlMetadata(initialUrl)
        .then((meta) => setScrapedMeta(meta))
        .catch(() => {});
    }
  }, [initialUrl]);

  // Photo / OCR Import State
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [photoError, setPhotoError] = useState('');

  // 1. URL Scraping Handlers
  const handleAnalyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsScrapingUrl(true);
    setUrlError('');

    try {
      const meta = await scrapeUrlMetadata(urlInput.trim());
      setScrapedMeta(meta);
    } catch (err: any) {
      setUrlError('No se pudo analizar la URL: ' + (err.message || 'error'));
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handleExtractFromUrl = async () => {
    let currentMeta = scrapedMeta;
    if (!currentMeta && urlInput.trim()) {
      try {
        setIsScrapingUrl(true);
        currentMeta = await scrapeUrlMetadata(urlInput.trim());
        setScrapedMeta(currentMeta);
      } catch (e) {
        console.warn('Scrape failed:', e);
      } finally {
        setIsScrapingUrl(false);
      }
    }

    const hasText = transcriptText.trim().length > 0;
    const title = currentMeta?.title?.trim() || '';
    const textToProcess = hasText ? transcriptText.trim() : (title || urlInput.trim());

    if (!urlInput.trim() && !hasText) {
      setUrlError('Introduce un enlace de YouTube o receta web.');
      return;
    }

    setIsExtracting(true);
    setUrlError('');

    try {
      const structured = await aiService.extractRecipe(textToProcess, {
        title: title || undefined,
        originUrl: currentMeta?.canonicalUrl || urlInput.trim(),
        author: currentMeta?.author,
        generateFromTitleIfEmpty: !hasText,
      });

      // Prepare recipe for review and editing in RecipeForm
      onReviewImportedRecipe({
        name: structured.name || title || 'Receta importada',
        description: structured.description || '',
        categoryId: structured.categoryId || categories[0]?.id || 'otros',
        subcategory: structured.subcategory,
        mainPhoto: currentMeta?.thumbnailBase64 || currentMeta?.thumbnailUrl,
        prepTimeMinutes: structured.prepTimeMinutes || 20,
        cookTimeMinutes: structured.cookTimeMinutes || 30,
        servings: structured.servings || 4,
        difficulty: structured.difficulty || 'fácil',
        tags: structured.tags || [],
        isFavorite: false,
        aiGenerated: structured.aiAssisted,
        origin: {
          type: currentMeta?.platform || 'youtube',
          originalUrl: currentMeta?.canonicalUrl || urlInput.trim(),
          author: currentMeta?.author,
          addedAt: new Date().toISOString(),
          status: 'available',
        },
        ingredients: (structured.ingredients && structured.ingredients.length > 0)
          ? structured.ingredients.map((ing, idx) => ({ ...ing, id: 'ing-imp-' + idx }))
          : [{ id: 'ing-imp-0', name: 'Completar ingrediente', amount: '', unit: '', notes: '' }],
        steps: (structured.steps && structured.steps.length > 0)
          ? structured.steps.map((st, idx) => ({ ...st, id: 'step-imp-' + idx }))
          : [{ id: 'step-imp-0', stepNumber: 1, instruction: 'Completar paso de elaboración' }],
        personalNotes: structured.personalNotes || (!hasText ? 'Receta formulada e investigada automáticamente con IA a partir del enlace. Revisa las cantidades y pasos a tu gusto.' : undefined),
      });
    } catch (err: any) {
      const msg = err.name === 'TimeoutError' || (err.message && (err.message.includes('aborted') || err.message.includes('timeout')))
        ? 'El servidor de Gemini tardó demasiado en responder (tiempo límite alcanzado). Vuelve a pulsar Extraer o cambia de modelo en Ajustes.'
        : (err.message || 'error desconocido');
      setUrlError('Error al estructurar receta con el asistente: ' + msg);
    } finally {
      setIsExtracting(false);
    }
  };

  // 2. Photo & OCR Handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPhotoError('');
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await processAndCompressImage(files[i], {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
        compressedList.push(base64);
      }
      setSelectedPhotos((prev) => [...prev, ...compressedList]);
    } catch (err: any) {
      setPhotoError('Error al cargar fotografía: ' + (err.message || 'error desconocido'));
    }
  };

  const handleRunOcr = async () => {
    if (selectedPhotos.length === 0) {
      setPhotoError('Selecciona primero al menos una fotografía de la receta.');
      return;
    }

    setIsProcessingOcr(true);
    setPhotoError('');

    try {
      let combinedText = '';
      for (let i = 0; i < selectedPhotos.length; i++) {
        const text = await recognizeTextFromImage(selectedPhotos[i], (prog) => {
          setOcrProgress({
            status: `Foto ${i + 1} de ${selectedPhotos.length}: ${prog.status}`,
            progress: prog.progress,
          });
        });
        combinedText += (combinedText ? '\n\n' : '') + text;
      }
      setOcrText(combinedText.trim());
    } catch (err: any) {
      setPhotoError('Fallo en el reconocimiento OCR: ' + (err.message || 'error desconocido'));
    } finally {
      setIsProcessingOcr(false);
      setOcrProgress(null);
    }
  };

  const handleExtractFromOcr = async () => {
    if (!ocrText.trim()) {
      setPhotoError('No hay texto reconocido para estructurar.');
      return;
    }

    setIsExtracting(true);
    setPhotoError('');

    try {
      const structured = await aiService.extractRecipe(ocrText.trim());

      onReviewImportedRecipe({
        name: structured.name || 'Receta desde fotografía',
        description: structured.description || '',
        categoryId: structured.categoryId || categories[0]?.id || 'otros',
        subcategory: structured.subcategory,
        mainPhoto: selectedPhotos[0], // Keep the original first photo as main photo!
        prepTimeMinutes: structured.prepTimeMinutes,
        cookTimeMinutes: structured.cookTimeMinutes,
        servings: structured.servings || 4,
        difficulty: structured.difficulty || 'fácil',
        tags: structured.tags || [],
        isFavorite: false,
        aiGenerated: structured.aiAssisted,
        origin: {
          type: 'photo',
          author: 'Fotografía / Libreta personal',
          addedAt: new Date().toISOString(),
          status: 'available',
        },
        ingredients: structured.ingredients.map((ing, idx) => ({
          ...ing,
          id: 'ing-ocr-' + idx,
        })),
        steps: structured.steps.map((st, idx) => ({
          ...st,
          id: 'step-ocr-' + idx,
        })),
        personalNotes: structured.personalNotes,
      });
    } catch (err: any) {
      setPhotoError('Error al estructurar receta: ' + (err.message || 'error desconocido'));
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <button
          onClick={onCancel}
          className="text-neutral-600 hover:text-neutral-900 font-medium text-sm p-1 rounded-lg hover:bg-neutral-100"
        >
          Cancelar
        </button>

        <h2 className="text-base font-bold text-neutral-800">Incorporar Receta</h2>

        <button
          onClick={() => setShowSettingsModal(true)}
          title="Ajustes de IA y Asistente"
          className="p-2 rounded-xl text-neutral-600 hover:text-amber-800 hover:bg-amber-50 transition"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Modalidad Selector (3 Tabs) */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-200/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'url'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-amber-600" />
            <span>Por Enlace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'photo'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Camera className="w-4 h-4 text-amber-600" />
            <span>Por Foto (OCR)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              onStartManual();
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'manual'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-amber-600" />
            <span>Manual</span>
          </button>
        </div>

        {/* TAB 1: IMPORTAR POR URL (YouTube, Instagram, TikTok, Web) */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Importar desde YouTube o enlaces web
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pega un enlace para extraer el autor, la miniatura y estructurar automáticamente los pasos
                </p>
              </div>

              {urlError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1 space-y-2">
                    <p>{urlError}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(urlError.includes('Ajustes') || urlError.includes('clave') || urlError.includes('Gemini')) && (
                        <button
                          type="button"
                          onClick={() => setShowSettingsModal(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition shadow-2xs"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Abrir Ajustes de Gemini</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => forceAppUpdate()}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 px-2.5 py-1.5 rounded-xl transition"
                      >
                        <span>Recargar última versión</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAnalyzeUrl} className="flex gap-2">
                <input
                  type="url"
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o instagram/web"
                  className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isScrapingUrl || !urlInput.trim()}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  {isScrapingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Analizar</span>
                </button>
              </form>

              {/* Scraped URL Info Card */}
              {scrapedMeta && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-2xl flex items-start gap-3">
                  {scrapedMeta.thumbnailUrl && (
                    <img
                      src={scrapedMeta.thumbnailUrl}
                      alt="Miniatura"
                      className="w-24 aspect-16/9 rounded-lg object-cover shadow-2xs shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase">
                      <Video className="w-3.5 h-3.5" />
                      <span>{scrapedMeta.platform}</span>
                    </div>
                    <label className="block text-[11px] text-neutral-500 mt-1 font-medium">
                      Nombre del plato / Título:
                    </label>
                    <input
                      type="text"
                      value={scrapedMeta.title || ''}
                      onChange={(e) => setScrapedMeta({ ...scrapedMeta, title: e.target.value })}
                      placeholder="Título o nombre del plato (ej: Tortilla de patatas)"
                      className="w-full text-xs font-bold px-2.5 py-1.5 mt-0.5 bg-white border border-amber-300 rounded-lg text-neutral-900 focus:outline-amber-500"
                    />
                    {scrapedMeta.author && (
                      <p className="text-[11px] text-neutral-500 mt-1">Canal: {scrapedMeta.author}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Botón principal de extracción automática con IA */}
              <button
                type="button"
                onClick={handleExtractFromUrl}
                disabled={isExtracting || (!urlInput.trim() && !transcriptText.trim())}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Investigando vídeo y extrayendo ingredientes con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span>
                      {transcriptText.trim()
                        ? 'Estructurar receta a partir del texto pegado'
                        : 'Extraer receta con IA (solo con el enlace)'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Opción desplegable para pegar texto/transcripción manual si se desea */}
              <div className="pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowManualTranscript(!showManualTranscript)}
                  className="w-full py-1 text-center text-xs font-semibold text-neutral-500 hover:text-amber-800 transition flex items-center justify-center gap-1"
                >
                  <span>{showManualTranscript ? '▲ Ocultar transcripción manual' : '▼ ¿Quieres pegar la transcripción o notas manualmente? (Opcional)'}</span>
                </button>

                {showManualTranscript && (
                  <div className="space-y-2 mt-3 animate-in fade-in duration-200">
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 space-y-1">
                      <p className="font-semibold text-neutral-700 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Cómo obtener la transcripción en YouTube:
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        En el vídeo de YouTube: toca en la descripción <strong>"... Más"</strong> &rarr; pulsa en <strong>"Mostrar transcripción"</strong> y pega el texto abajo.
                      </p>
                    </div>

                    <textarea
                      rows={5}
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      placeholder="Pega aquí la transcripción o notas del cocinero si prefieres proporcionarlas manualmente..."
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IMPORTAR POR FOTOGRAFÍA (OCR) */}
        {activeTab === 'photo' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Importar desde fotos de recetas o libros
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  El motor OCR local escanea el texto de la imagen y la IA lo convierte en una receta estructurada
                </p>
              </div>

              {photoError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              {/* Photo Upload Area */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-neutral-200 shadow-xs">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedPhotos(selectedPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 flex flex-col items-center justify-center text-amber-700 text-xs font-semibold p-2 transition"
                  >
                    <Camera className="w-6 h-6 mb-1 text-amber-600" />
                    <span>Añadir foto</span>
                  </button>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

              {/* Run OCR Button */}
              {selectedPhotos.length > 0 && !ocrText && (
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isProcessingOcr}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  {isProcessingOcr ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{ocrProgress?.status || 'Procesando OCR en el dispositivo...'}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Reconocer texto con OCR</span>
                    </>
                  )}
                </button>
              )}

              {/* OCR Progress Bar */}
              {isProcessingOcr && ocrProgress && (
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 transition-all duration-200"
                    style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                  />
                </div>
              )}

              {/* Recognized Text Area */}
              {ocrText && (
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-700">
                      Texto reconocido de la fotografía (revisable)
                    </label>
                    <button
                      type="button"
                      onClick={handleRunOcr}
                      className="text-[11px] text-amber-700 hover:underline"
                    >
                      Re-escanear
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-amber-500 outline-hidden font-mono"
                  />

                  <button
                    type="button"
                    onClick={handleExtractFromOcr}
                    disabled={isExtracting || !ocrText.trim()}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Estructurando receta...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Estructurar y Revisar Receta</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
