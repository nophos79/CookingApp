import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListCheck,
  Clock,
  Sparkles,
  SunMedium,
  Check,
} from 'lucide-react';
import type { Recipe } from '../../types/recipe';

interface CookModeProps {
  recipe: Recipe;
  onExit: () => void;
}

export const CookMode: React.FC<CookModeProps> = ({ recipe, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  // Request Wake Lock on mount so phone screen doesn't go to sleep while cooking
  useEffect(() => {
    let wakeLockSentinel: any = null;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch (err) {
        console.warn('Wake Lock no disponible o denegado:', err);
      }
    }

    requestWakeLock();

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  const toggleStepCompleted = (index: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 text-white flex flex-col justify-between overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            aria-label="Cerrar modo cocina"
            className="p-2 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-base font-bold line-clamp-1">{recipe.name}</h2>
            <p className="text-xs text-neutral-400">Modo Cocina Paso a Paso</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wakeLockActive && (
            <span
              title="Pantalla activa permanente"
              className="hidden sm:flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full"
            >
              <SunMedium className="w-3.5 h-3.5" /> Pantalla activa
            </span>
          )}

          <button
            onClick={() => setShowIngredientsDrawer(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-400 px-3 py-2 rounded-xl border border-neutral-700 transition active:scale-95"
          >
            <ListCheck className="w-4 h-4" />
            <span>Ingredientes</span>
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-neutral-800 h-1.5">
        <div
          className="bg-amber-500 h-1.5 transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Center Content: Big Step Text */}
      <div className="flex-1 flex flex-col justify-center px-6 py-6 max-w-2xl mx-auto w-full overflow-y-auto">
        {currentStep ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Paso {currentStepIndex + 1} de {totalSteps}
              </span>

              {currentStep.estimatedMinutes && (
                <span className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {currentStep.estimatedMinutes} min
                </span>
              )}
            </div>

            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-relaxed text-neutral-100">
              {currentStep.instruction}
            </p>

            {currentStep.photoUrl && (
              <div className="rounded-2xl overflow-hidden max-h-56 bg-neutral-800">
                <img
                  src={currentStep.photoUrl}
                  alt={`Foto paso ${currentStep.stepNumber}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <button
              onClick={() => toggleStepCompleted(currentStepIndex)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition ${
                completedSteps[currentStepIndex]
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  completedSteps[currentStepIndex]
                    ? 'bg-emerald-500 border-emerald-400 text-neutral-900'
                    : 'border-neutral-500'
                }`}
              >
                {completedSteps[currentStepIndex] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span>
                {completedSteps[currentStepIndex] ? 'Paso completado' : 'Marcar como completado'}
              </span>
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
            <p className="text-xl font-bold">¡Buen provecho!</p>
            <p className="text-sm text-neutral-400">Has revisado todos los pasos de esta receta.</p>
          </div>
        )}
      </div>

      {/* Bottom Large Nav Buttons for Mobile Cooking */}
      <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 flex items-center gap-3 max-w-2xl mx-auto w-full">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="flex-1 py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white font-bold text-base flex items-center justify-center gap-2 transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Anterior</span>
        </button>

        {currentStepIndex < totalSteps - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-900/30"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onExit}
            className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Finalizar</span>
          </button>
        )}
      </div>

      {/* Slide-over Drawer for Ingredients during Cooking */}
      {showIngredientsDrawer && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-neutral-900 h-full p-6 flex flex-col justify-between border-l border-neutral-800 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ListCheck className="w-5 h-5 text-amber-400" />
                  Ingredientes ({recipe.ingredients?.length || 0})
                </h3>
                <button
                  onClick={() => setShowIngredientsDrawer(false)}
                  className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
                {recipe.ingredients?.map((ing) => (
                  <div
                    key={ing.id}
                    className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-semibold text-neutral-200 block">{ing.name}</span>
                      {ing.notes && <span className="text-xs text-neutral-400">{ing.notes}</span>}
                    </div>
                    {(ing.amount || ing.unit) && (
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded-md shrink-0">
                        {ing.amount} {ing.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowIngredientsDrawer(false)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl mt-4"
            >
              Volver al paso actual
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
