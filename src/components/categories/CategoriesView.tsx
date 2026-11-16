import React, { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import type { Category, Recipe } from '../../types/recipe';
import { CategoryIcon } from '../common/CategoryIcon';

interface CategoriesViewProps {
  categories: Category[];
  recipes: Recipe[];
  onSelectCategory: (catId: string) => void;
  onAddCategory: (name: string) => Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  recipes,
  onSelectCategory,
  onAddCategory,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate count of recipes per category
  const getRecipeCount = (catId: string) => {
    return recipes.filter((r) => r.categoryId === catId).length;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(newCatName.trim());
      setNewCatName('');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">Categorías</h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            Explora tus {recipes.length} recetas agrupadas por tipo
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva categoría</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const count = getRecipeCount(cat.id);
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-100 transition">
                  <CategoryIcon name={cat.iconName} className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 group-hover:bg-amber-100 group-hover:text-amber-800 transition">
                  {count}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-800 group-hover:text-amber-900 line-clamp-1">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {count === 1 ? '1 receta' : `${count} recetas`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <FolderOpen className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-neutral-900">Crear Nueva Categoría</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Añade una sección personalizada para organizar tus recetas
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ej: Panadería, Desayunos..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCatName.trim()}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 disabled:opacity-50 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
