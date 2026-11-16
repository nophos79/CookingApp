import React from 'react';
import { Clock, Heart, PlayCircle, Video, Camera, Sparkles } from 'lucide-react';
import type { Recipe } from '../../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  categoryName?: string;
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  categoryName,
  onSelect,
  onToggleFavorite,
}) => {
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const getOriginBadge = () => {
    if (!recipe.origin) return null;
    if (recipe.origin.type === 'youtube') {
      return (
        <span className="flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-xs">
          <Video className="w-3 h-3" />
          <span>YouTube</span>
        </span>
      );
    }
    if (recipe.origin.type === 'instagram') {
      return (
        <span className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-sm">
          <Camera className="w-3 h-3" />
          <span>IG</span>
        </span>
      );
    }
    if (recipe.origin.type === 'tiktok') {
      return (
        <span className="flex items-center gap-1 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-sm">
          <PlayCircle className="w-3 h-3" />
          <span>TikTok</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={() => onSelect(recipe)}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-200/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
    >
      {/* Recipe Image Container */}
      <div className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden">
        {recipe.mainPhoto ? (
          <img
            src={recipe.mainPhoto}
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700">
            <Sparkles className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e, recipe.id);
          }}
          aria-label={recipe.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-md text-neutral-600 shadow-sm transition hover:scale-110 active:scale-95"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              recipe.isFavorite
                ? 'fill-rose-500 text-rose-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          />
        </button>

        {/* Origin Badges (top left) */}
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1 max-w-[80%]">
          {getOriginBadge()}
          {recipe.aiGenerated && (
            <span className="bg-amber-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              IA
            </span>
          )}
          {recipe.isDraft && (
            <span className="bg-amber-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              Borrador
            </span>
          )}
        </div>

        {/* Time Badge (bottom right over image) */}
        {totalTime > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3" />
            <span>{totalTime}m</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
        <div>
          {categoryName && (
            <span className="inline-block text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mb-1 line-clamp-1">
              {categoryName}
            </span>
          )}
          <h3 className="font-semibold text-neutral-800 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-amber-800">
            {recipe.name}
          </h3>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100">
          <span className="capitalize">{recipe.difficulty}</span>
          <span>{recipe.ingredients?.length || 0} ing.</span>
        </div>
      </div>
    </div>
  );
};
