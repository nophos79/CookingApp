import React from 'react';
import { SlidersHorizontal, BookOpen } from 'lucide-react';
import type { Category, OriginType, Recipe, RecipeFilter } from '../../types/recipe';
import { RecipeCard } from '../recipes/RecipeCard';

interface LibraryViewProps {
  recipes: Recipe[];
  categories: Category[];
  filter: RecipeFilter;
  onFilterChange: (newFilter: RecipeFilter) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  recipes,
  categories,
  filter,
  onFilterChange,
  onSelectRecipe,
  onToggleFavorite,
}) => {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">Biblioteca Completa</h2>
        <p className="text-xs sm:text-sm text-neutral-500">
          Filtra y explora todas tus recetas guardadas
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          <span>Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Categoría
            </label>
            <select
              value={filter.categoryId || 'all'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  categoryId: e.target.value === 'all' ? undefined : e.target.value,
                })
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs"
            >
              <option value="all">Todas ({recipes.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Origin Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">Origen</label>
            <select
              value={filter.originType || 'all'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  originType: e.target.value === 'all' ? undefined : (e.target.value as OriginType),
                })
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs"
            >
              <option value="all">Todos los orígenes</option>
              <option value="youtube">Vídeos de YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="photo">Fotos / Libros</option>
              <option value="manual">Manuales</option>
              <option value="web">Páginas web</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">Tiempo</label>
            <select
              value={filter.maxTimeMinutes || 'all'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  maxTimeMinutes: e.target.value === 'all' ? undefined : Number(e.target.value),
                })
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs"
            >
              <option value="all">Cualquier tiempo</option>
              <option value="30">Rápidas (&le; 30 min)</option>
              <option value="60">Menos de 1 hora</option>
              <option value="90">Menos de 1h 30m</option>
            </select>
          </div>

          {/* Quick Toggle Checkboxes */}
          <div className="flex flex-col justify-end gap-1.5 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={!!filter.onlyFavorites}
                onChange={(e) =>
                  onFilterChange({ ...filter, onlyFavorites: e.target.checked ? true : undefined })
                }
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Solo favoritos</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={!!filter.onlyDrafts}
                onChange={(e) =>
                  onFilterChange({ ...filter, onlyDrafts: e.target.checked ? true : undefined })
                }
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Solo borradores</span>
            </label>
          </div>
        </div>

        {/* Reset active filters pill */}
        {(filter.categoryId ||
          filter.originType ||
          filter.maxTimeMinutes ||
          filter.onlyFavorites ||
          filter.onlyDrafts ||
          filter.query) && (
          <div className="pt-1 flex items-center justify-between border-t border-neutral-100">
            <span className="text-[11px] text-amber-800 font-medium">Filtros aplicados</span>
            <button
              onClick={() => onFilterChange({})}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Recipe Grid or Empty State */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-neutral-500">
          {recipes.length} {recipes.length === 1 ? 'receta encontrada' : 'recetas encontradas'}
        </span>
      </div>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              categoryName={categoryMap.get(recipe.categoryId)}
              onSelect={onSelectRecipe}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200/80 space-y-3">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-800">No se encontraron recetas</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Prueba a cambiar los filtros o el texto de búsqueda para encontrar lo que necesitas.
          </p>
          <button
            onClick={() => onFilterChange({})}
            className="px-4 py-2 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl hover:bg-amber-100 transition"
          >
            Ver todas las recetas
          </button>
        </div>
      )}
    </div>
  );
};
