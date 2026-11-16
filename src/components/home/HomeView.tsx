import React from 'react';
import {
  Sparkles,
  Heart,
  Clock,
  PlusCircle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import type { Category, Recipe } from '../../types/recipe';
import { RecipeCard } from '../recipes/RecipeCard';
import { CategoryIcon } from '../common/CategoryIcon';

interface HomeViewProps {
  recipes: Recipe[];
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onAddNewRecipe: () => void;
  onViewAllFavorites: () => void;
  onViewAllRecipes: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recipes,
  categories,
  onSelectCategory,
  onSelectRecipe,
  onToggleFavorite,
  onAddNewRecipe,
  onViewAllFavorites,
  onViewAllRecipes,
}) => {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const favoriteRecipes = recipes.filter((r) => r.isFavorite);
  const recentRecipes = [...recipes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Hero Quick Search & Add Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 text-white p-5 sm:p-6 shadow-md">
        <div className="relative z-10 max-w-lg space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tu colección personal y offline</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            ¿Qué cocinamos hoy?
          </h2>

          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            Conserva tus recetas de YouTube, fotos y notas familiares sin depender de enlaces externos.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={onAddNewRecipe}
              className="flex items-center gap-2 bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>Añadir nueva receta</span>
            </button>

            <button
              onClick={onViewAllRecipes}
              className="flex items-center gap-1.5 bg-amber-800/60 hover:bg-amber-800/80 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl backdrop-blur-xs transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver todas ({recipes.length})</span>
            </button>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Categories Horizontal Carousel / Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
            Categorías
          </h3>
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/80 border border-neutral-200/80 shadow-2xs shrink-0 transition active:scale-95 group text-left"
            >
              <span className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center group-hover:scale-105 transition">
                <CategoryIcon name={cat.iconName} className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-neutral-700 group-hover:text-amber-900">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recetas Favoritas */}
      {favoriteRecipes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              Recetas Favoritas ({favoriteRecipes.length})
            </h3>
            <button
              onClick={onViewAllFavorites}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
            >
              <span>Ver más</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {favoriteRecipes.slice(0, 4).map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                categoryName={categoryMap.get(recipe.categoryId)}
                onSelect={onSelectRecipe}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Últimas Recetas Incorporadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            Últimas incorporadas
          </h3>
          <button
            onClick={onViewAllRecipes}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
          >
            <span>Ver biblioteca</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {recentRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              categoryName={categoryMap.get(recipe.categoryId)}
              onSelect={onSelectRecipe}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
