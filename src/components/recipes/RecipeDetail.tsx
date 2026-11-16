import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Edit3,
  Trash2,
  Clock,
  Users,
  ChefHat,
  ExternalLink,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  AlertCircle,
  Share2,
  Printer,
  Download,
} from 'lucide-react';
import type { Category, Recipe } from '../../types/recipe';
import { backupService } from '../../services/backup/backupService';

interface RecipeDetailProps {
  recipe: Recipe;
  categories: Category[];
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onStartCookMode: (recipe: Recipe) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  categories,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStartCookMode,
}) => {
  // Track checked ingredients for cooking prep
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const category = categories.find((c) => c.id === recipe.categoryId);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper to extract YouTube video ID if present
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  };

  const youtubeEmbedUrl =
    recipe.origin?.type === 'youtube' ? getYouTubeEmbedUrl(recipe.origin.originalUrl) : null;

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 md:pb-12">
      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 font-medium text-sm p-1 -ml-1 rounded-lg hover:bg-neutral-100 active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Print to PDF Button */}
          <button
            onClick={() => window.print()}
            title="Imprimir o guardar en PDF"
            aria-label="Imprimir receta"
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* Download JSON Button */}
          <button
            onClick={() => {
              const blob = backupService.exportSingleRecipeJson(recipe);
              backupService.triggerDownload(blob, `${recipe.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
            }}
            title="Exportar archivo JSON"
            aria-label="Descargar JSON"
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={() => onToggleFavorite(recipe.id)}
            aria-label="Favorito"
            className="p-2 rounded-full bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 transition"
          >
            <Heart
              className={`w-5 h-5 ${
                recipe.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-neutral-600'
              }`}
            />
          </button>

          <button
            onClick={() => onEdit(recipe)}
            aria-label="Editar receta"
            className="p-2 rounded-full bg-neutral-100 hover:bg-amber-50 text-neutral-600 hover:text-amber-700 transition"
          >
            <Edit3 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Eliminar receta"
            className="p-2 rounded-full bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        {/* Main Photo & Badges */}
        <div className="relative aspect-16/9 w-full bg-neutral-900 rounded-3xl overflow-hidden shadow-md">
          {recipe.mainPhoto ? (
            <img
              src={recipe.mainPhoto}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-amber-700 to-orange-500 text-white p-6 text-center">
              <ChefHat className="w-16 h-16 mb-2 opacity-80" />
              <p className="text-xl font-bold">{recipe.name}</p>
            </div>
          )}

          {category && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-amber-900 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {category.name}
            </div>
          )}

          {/* Quick Cook Mode Trigger over Hero */}
          {recipe.steps?.length > 0 && (
            <button
              onClick={() => onStartCookMode(recipe)}
              className="absolute bottom-4 right-4 flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg active:scale-95 transition"
            >
              <ChefHat className="w-4 h-4" />
              <span>Modo Cocina</span>
            </button>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 leading-tight">
              {recipe.name}
            </h1>
            {recipe.aiGenerated && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                <ChefHat className="w-3 h-3 text-amber-700" />
                Asistida por IA
              </span>
            )}
          </div>

          {recipe.description && (
            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
              {recipe.description}
            </p>
          )}

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipe.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-neutral-100 text-neutral-600 text-xs px-2.5 py-0.5 rounded-md font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Meta Stats Bar */}
        <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs text-center">
          <div className="flex flex-col items-center justify-center p-1">
            <Clock className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Total</span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-800">{totalTime} min</span>
          </div>

          <div className="flex flex-col items-center justify-center p-1 border-l border-neutral-100">
            <Users className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Comensales</span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-800">
              {recipe.servings || 4}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1 border-l border-neutral-100">
            <ChefHat className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Dificultad</span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-800 capitalize">
              {recipe.difficulty}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1 border-l border-neutral-100">
            <Play className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Origen</span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-800 capitalize">
              {recipe.origin?.type || 'Manual'}
            </span>
          </div>
        </div>

        {/* Origin & Video Section (Independent of external survival) */}
        {recipe.origin && (recipe.origin.originalUrl || recipe.origin.author) && (
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-900">
              <span className="font-semibold flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                Referencia original:
              </span>
              {recipe.origin.status === 'unavailable' && (
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Vídeo/enlace no disponible (receta conservada)
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div>
                {recipe.origin.author && (
                  <p className="font-medium text-neutral-800">
                    Autor / Canal: <span className="text-amber-800">{recipe.origin.author}</span>
                  </p>
                )}
                {recipe.origin.addedAt && (
                  <p className="text-xs text-neutral-500">
                    Añadido el {new Date(recipe.origin.addedAt).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>

              {recipe.origin.originalUrl && (
                <a
                  href={recipe.origin.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
                >
                  <span>Abrir enlace original</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Embedded Video Player if YouTube */}
            {youtubeEmbedUrl && (
              <div className="mt-3 overflow-hidden rounded-xl aspect-16/9 bg-black shadow-inner">
                <iframe
                  src={youtubeEmbedUrl}
                  title="Vídeo de la receta"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

        {/* Ingredients Checklist */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Ingredientes ({recipe.ingredients?.length || 0})
            </h2>
            <span className="text-xs text-neutral-400">Toca para tachar</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {recipe.ingredients?.map((ing) => {
              const isChecked = checkedIngredients[ing.id];
              return (
                <div
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={`flex items-start gap-3 py-3 cursor-pointer select-none transition ${
                    isChecked ? 'opacity-40' : 'hover:bg-neutral-50/50'
                  }`}
                >
                  <button type="button" className="mt-0.5 text-amber-600 focus:outline-hidden">
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-300" />
                    )}
                  </button>

                  <div className="flex-1 text-sm">
                    <span
                      className={`font-medium ${
                        isChecked ? 'line-through text-neutral-400' : 'text-neutral-800'
                      }`}
                    >
                      {ing.name}
                    </span>
                    {ing.notes && (
                      <span className="text-xs text-neutral-500 block italic">{ing.notes}</span>
                    )}
                  </div>

                  {(ing.amount || ing.unit) && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        isChecked
                          ? 'bg-neutral-100 text-neutral-400 line-through'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {ing.amount} {ing.unit}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Elaboration Step-by-Step */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              Elaboración paso a paso
            </h2>
            {recipe.steps?.length > 0 && (
              <button
                onClick={() => onStartCookMode(recipe)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <ChefHat className="w-3.5 h-3.5" />
                Iniciar modo cocina
              </button>
            )}
          </div>

          <div className="space-y-4">
            {recipe.steps?.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/70 border border-neutral-100"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs shrink-0 mt-0.5">
                  {step.stepNumber}
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-sm text-neutral-800 leading-relaxed">{step.instruction}</p>

                  {step.photoUrl && (
                    <img
                      src={step.photoUrl}
                      alt={`Paso ${step.stepNumber}`}
                      className="rounded-xl max-h-48 w-full object-cover shadow-xs"
                    />
                  )}

                  {step.estimatedMinutes && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {step.estimatedMinutes} min aprox.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Notes */}
        {recipe.personalNotes && (
          <div className="bg-amber-100/40 border border-amber-300/60 rounded-3xl p-5 space-y-2 shadow-xs">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              Mis Notas y Modificaciones Personales
            </h3>
            <p className="text-sm text-amber-950/80 leading-relaxed whitespace-pre-wrap">
              {recipe.personalNotes}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-neutral-900">¿Eliminar receta?</h3>
              <p className="text-sm text-neutral-500">
                Esta acción eliminará "{recipe.name}" y sus fotografías guardadas de forma permanente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(recipe.id);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 active:scale-95 transition shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
