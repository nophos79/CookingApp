import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListCheck,
  Clock,
  Sparkles,
  SunMedium,
  MoveHorizontal,
} from 'lucide-react';
import type { Recipe } from '../../types/recipe';

interface CookModeProps {
  recipe: Recipe;
  onExit: () => void;
}

export const CookMode: React.FC<CookModeProps> = ({ recipe, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Swipe & Drag gesture state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalGestureRef = useRef<boolean | null>(null);

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

  // Keyboard navigation support (PC / external keyboards)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrev();
      } else if (e.key === 'Escape') {
        if (showIngredientsDrawer) {
          setShowIngredientsDrawer(false);
        } else {
          onExit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, totalSteps, showIngredientsDrawer]);

  // Touch Swipe Handlers (Mobile & Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isHorizontalGestureRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPosRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startPosRef.current.x;
    const deltaY = currentY - startPosRef.current.y;

    if (isHorizontalGestureRef.current === null) {
      // Determine gesture direction once movement exceeds 10px
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalGestureRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalGestureRef.current) {
      // Elastic resistance at beginning / end of recipe
      const isAtStart = currentStepIndex === 0 && deltaX > 0;
      const isAtEnd = currentStepIndex === totalSteps - 1 && deltaX < 0;
      const factor = isAtStart || isAtEnd ? 0.25 : 1;
      setDragOffset(deltaX * factor);
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalGestureRef.current) {
      const swipeThreshold = 55;
      if (dragOffset < -swipeThreshold && currentStepIndex < totalSteps - 1) {
        handleNext();
      } else if (dragOffset > swipeThreshold && currentStepIndex > 0) {
        handlePrev();
      }
    }
    setDragOffset(0);
    setIsDragging(false);
    startPosRef.current = null;
    isHorizontalGestureRef.current = null;
  };

  // Mouse Drag Handlers (Desktop / Trackpads)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isHorizontalGestureRef.current = true;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPosRef.current || !isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const isAtStart = currentStepIndex === 0 && deltaX > 0;
    const isAtEnd = currentStepIndex === totalSteps - 1 && deltaX < 0;
    const factor = isAtStart || isAtEnd ? 0.25 : 1;
    setDragOffset(deltaX * factor);
  };

  const handleMouseUp = () => {
    if (isDragging && isHorizontalGestureRef.current) {
      const swipeThreshold = 55;
      if (dragOffset < -swipeThreshold && currentStepIndex < totalSteps - 1) {
        handleNext();
      } else if (dragOffset > swipeThreshold && currentStepIndex > 0) {
        handlePrev();
      }
    }
    setDragOffset(0);
    setIsDragging(false);
    startPosRef.current = null;
    isHorizontalGestureRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 text-white flex flex-col justify-between overflow-hidden select-none">
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

      {/* Center Interactive Swipe / Drag Area */}
      <div
        className="flex-1 relative flex flex-col justify-center px-6 py-4 max-w-2xl mx-auto w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Swipe Feedback Hints */}
        {dragOffset > 25 && currentStepIndex > 0 && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-neutral-800/90 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in zoom-in-90 duration-150">
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </div>
        )}

        {dragOffset < -25 && currentStepIndex < totalSteps - 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-neutral-800/90 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in zoom-in-90 duration-150">
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}

        {/* Step Content Container with dynamic translateX */}
        <div
          className="w-full max-h-[75vh] overflow-y-auto px-1 py-2"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
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

              <p className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-relaxed text-neutral-100 select-text">
                {currentStep.instruction}
              </p>

              {currentStep.photoUrl && (
                <div className="rounded-2xl overflow-hidden max-h-56 bg-neutral-800 pointer-events-none">
                  <img
                    src={currentStep.photoUrl}
                    alt={`Foto paso ${currentStep.stepNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Subtly indicated gesture helper */}
              <div className="pt-2 flex items-center justify-center gap-2 text-neutral-500 text-xs">
                <MoveHorizontal className="w-4 h-4 text-neutral-500" />
                <span>Desliza para cambiar de paso</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-xl font-bold">¡Buen provecho!</p>
              <p className="text-sm text-neutral-400">Has revisado todos los pasos de esta receta.</p>
            </div>
          )}
        </div>
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
