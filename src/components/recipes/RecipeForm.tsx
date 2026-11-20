import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Plus,
  Clock,
  Users,
  ChefHat,
  Share2,
  FileText,
  Save,
  Tag,
  AlertCircle,
  MoveUp,
  MoveDown,
  X,
  Upload,
} from 'lucide-react';
import type { Category, DifficultyLevel, Ingredient, OriginType, Recipe, Step } from '../../types/recipe';
import { processAndCompressImage } from '../../services/imageStorage';

interface RecipeFormProps {
  initialRecipe?: Partial<Recipe> | null;
  categories: Category[];
  isReviewingImport?: boolean;
  onSave: (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  initialRecipe,
  categories,
  isReviewingImport = false,
  onSave,
  onCancel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General fields
  const [name, setName] = useState(initialRecipe?.name || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [categoryId, setCategoryId] = useState(initialRecipe?.categoryId || categories[0]?.id || 'otros');
  const [subcategory, setSubcategory] = useState(initialRecipe?.subcategory || '');
  const [mainPhoto, setMainPhoto] = useState<string | undefined>(initialRecipe?.mainPhoto);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | undefined>(initialRecipe?.prepTimeMinutes || 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | undefined>(initialRecipe?.cookTimeMinutes || 20);
  const [servings, setServings] = useState<number | undefined>(initialRecipe?.servings || 4);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialRecipe?.difficulty || 'fácil');
  const [isFavorite, setIsFavorite] = useState(initialRecipe?.isFavorite || false);
  const [isDraft, setIsDraft] = useState(initialRecipe?.isDraft || false);

  // Tags
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Origin
  const [originType, setOriginType] = useState<OriginType>(initialRecipe?.origin?.type || 'manual');
  const [originalUrl, setOriginalUrl] = useState(initialRecipe?.origin?.originalUrl || '');
  const [author, setAuthor] = useState(initialRecipe?.origin?.author || '');

  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients || [
      { id: 'ing-1', name: '', amount: '', unit: '', notes: '' },
    ]
  );

  // Steps
  const [steps, setSteps] = useState<Step[]>(
    initialRecipe?.steps || [
      { id: 'step-1', stepNumber: 1, instruction: '', estimatedMinutes: undefined },
    ]
  );

  // Notes
  const [personalNotes, setPersonalNotes] = useState(initialRecipe?.personalNotes || '');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Process a selected or dropped image file
  const processPhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecciona o arrastra un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    setErrorMsg('');
    try {
      const compressedBase64 = await processAndCompressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });
      setMainPhoto(compressedBase64);
    } catch (err: any) {
      setErrorMsg('No se pudo procesar la fotografía: ' + (err.message || 'error desconocido'));
    }
  };

  // Handle Photo Upload via File Input
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhotoFile(file);
    e.target.value = '';
  };

  // Handle Drag & Drop for Photo
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handleDropPhoto = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processPhotoFile(file);
    }
  };

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Ingredients management
  const handleAddIngredient = () => {
    const newId = 'ing-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setIngredients([...ingredients, { id: newId, name: '', amount: '', unit: '', notes: '' }]);
  };

  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const handleRemoveIngredient = (id: string) => {
    if (ingredients.length <= 1) {
      setIngredients([{ id: 'ing-1', name: '', amount: '', unit: '', notes: '' }]);
      return;
    }
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  // Steps management
  const handleAddStep = () => {
    const nextNumber = steps.length + 1;
    const newId = 'step-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setSteps([
      ...steps,
      { id: newId, stepNumber: nextNumber, instruction: '', estimatedMinutes: undefined },
    ]);
  };

  const handleUpdateStep = (id: string, field: keyof Step, value: any) => {
    setSteps(
      steps.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveStep = (id: string) => {
    const filtered = steps.filter((s) => s.id !== id);
    // Renumber steps
    const renumbered = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(renumbered);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Renumber
    setSteps(newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  // Submit
  const handleSubmit = async (asDraft = false) => {
    if (!name.trim()) {
      setErrorMsg('Por favor, indica al menos un nombre para la receta.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Clean up ingredients
      const cleanIngredients = ingredients.filter((ing) => ing.name.trim() !== '');

      // Clean up steps
      const cleanSteps = steps
        .filter((s) => s.instruction.trim() !== '')
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

      await onSave({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        subcategory: subcategory.trim() || undefined,
        mainPhoto,
        prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : undefined,
        cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : undefined,
        servings: servings ? Number(servings) : undefined,
        difficulty,
        tags,
        isFavorite,
        isDraft: asDraft || isDraft,
        origin: {
          type: originType,
          originalUrl: originalUrl.trim() || undefined,
          author: author.trim() || undefined,
          addedAt: initialRecipe?.origin?.addedAt || new Date().toISOString(),
          status: 'available',
        },
        ingredients: cleanIngredients,
        steps: cleanSteps,
        personalNotes: personalNotes.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMsg('Error al guardar la receta: ' + (err.message || 'error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-12">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 font-medium text-sm p-1 rounded-lg hover:bg-neutral-100"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Cancelar</span>
        </button>

        <h2 className="text-base font-bold text-neutral-800">
          {initialRecipe ? 'Editar Receta' : 'Nueva Receta'}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-xs transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {isReviewingImport && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-xs">
            <ChefHat className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-950">Receta importada y estructurada</p>
              <p className="text-amber-800/90 mt-0.5">
                Revisa los ingredientes, cantidades y pasos extraídos. Puedes modificar o completar cualquier dato antes de guardarla definitivamente.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Main Photo Picker with Drag & Drop */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Fotografía del plato
          </label>
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropPhoto}
            className={`relative aspect-16/9 w-full rounded-3xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all ${
              isDraggingPhoto
                ? 'border-amber-500 bg-amber-100/70 ring-4 ring-amber-400/30 scale-[1.01]'
                : mainPhoto
                ? 'border-neutral-300 bg-neutral-100 group'
                : 'border-neutral-300 hover:border-amber-400 bg-neutral-100/80 hover:bg-amber-50/30'
            }`}
          >
            {isDraggingPhoto ? (
              <div className="flex flex-col items-center justify-center p-6 text-amber-800 animate-in fade-in zoom-in-95 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center mb-2 shadow-inner">
                  <Upload className="w-7 h-7 animate-bounce" />
                </div>
                <span className="text-base font-bold">¡Suelta la imagen aquí!</span>
                <span className="text-xs text-amber-700/80 mt-0.5">Se optimizará y guardará automáticamente</span>
              </div>
            ) : mainPhoto ? (
              <>
                <img
                  src={mainPhoto}
                  alt="Previsualización"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Cambiar fotografía"
                    className="p-2.5 rounded-full bg-white text-neutral-800 shadow-md hover:bg-neutral-100 transition active:scale-95"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainPhoto(undefined)}
                    title="Eliminar fotografía"
                    className="p-2.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/60 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-xs pointer-events-none opacity-0 group-hover:opacity-100 transition">
                  O arrastra otra foto encima
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-neutral-500 hover:text-amber-800 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-neutral-800 group-hover:text-amber-800">
                  Toma, elige o arrastra una fotografía
                </span>
                <span className="text-xs text-neutral-400 group-hover:text-amber-700/70 mt-1">
                  Haz clic para abrir el selector o suelta aquí tu archivo de imagen
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* 2. General Information */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
            Información básica
          </h3>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nombre de la receta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pollo al curry con manzana"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Descripción breve
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumen o características principales del plato..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Categoría principal
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Subcategoría (opcional)
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Ej: Platos de fiesta, Guisos..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
              />
            </div>
          </div>

          {/* Times, Servings, Difficulty */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Prep (min)
              </label>
              <input
                type="number"
                min="0"
                value={prepTimeMinutes || ''}
                onChange={(e) => setPrepTimeMinutes(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="15"
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" /> Cocción (min)
              </label>
              <input
                type="number"
                min="0"
                value={cookTimeMinutes || ''}
                onChange={(e) => setCookTimeMinutes(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="25"
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" /> Comensales
              </label>
              <input
                type="number"
                min="1"
                value={servings || ''}
                onChange={(e) => setServings(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="4"
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5 text-amber-600" /> Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-2.5 py-2 text-sm rounded-xl border border-neutral-300 bg-white"
              >
                <option value="fácil">Fácil</option>
                <option value="media">Media</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
          </div>

          {/* Quick Flags: Favorite & Draft */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Marcar como receta favorita</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Guardar como borrador pendiente</span>
            </label>
          </div>

          {/* Tags */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              Etiquetas
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Añadir etiqueta y pulsar Enter (ej: rápida, horno...)"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold text-neutral-700"
              >
                Añadir
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs px-2.5 py-1 rounded-lg border border-amber-200"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-amber-950 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Origin Information */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-amber-600" />
            Origen de la receta
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Tipo de origen
              </label>
              <select
                value={originType}
                onChange={(e) => setOriginType(e.target.value as OriginType)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 bg-white"
              >
                <option value="youtube">Vídeo de YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="web">Página web</option>
                <option value="photo">Fotografía / Libro</option>
                <option value="manual">Introducción manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Canal o Autor
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ej: Cocina con Carmen"
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Enlace / URL original
              </label>
              <input
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
              />
            </div>
          </div>
        </div>

        {/* 4. Ingredients */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
              Ingredientes ({ingredients.length})
            </h3>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir ingrediente</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {ingredients.map((ing, idx) => (
              <div
                key={ing.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 bg-neutral-50/70 rounded-xl border border-neutral-200/70"
              >
                <span className="text-xs font-bold text-neutral-400 w-5 text-center shrink-0">
                  {idx + 1}.
                </span>

                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                  placeholder="Nombre ingrediente (ej: Patatas)"
                  className="flex-1 w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white rounded-lg border border-neutral-200"
                />

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="text"
                    value={ing.amount || ''}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'amount', e.target.value)}
                    placeholder="Cantidad (ej: 500)"
                    className="w-24 px-2 py-1.5 text-xs sm:text-sm bg-white rounded-lg border border-neutral-200 text-center"
                  />

                  <input
                    type="text"
                    value={ing.unit || ''}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'unit', e.target.value)}
                    placeholder="Unidad (g, ml, uds)"
                    className="w-24 px-2 py-1.5 text-xs sm:text-sm bg-white rounded-lg border border-neutral-200 text-center"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing.id)}
                    aria-label="Eliminar ingrediente"
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Elaboration Steps */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
              Pasos de elaboración ({steps.length})
            </h3>
            <button
              type="button"
              onClick={handleAddStep}
              className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir paso</span>
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="p-3.5 bg-neutral-50/70 rounded-2xl border border-neutral-200/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                    Paso {step.stepNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={idx === steps.length - 1}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(step.id)}
                      className="p-1 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={step.instruction}
                  onChange={(e) => handleUpdateStep(step.id, 'instruction', e.target.value)}
                  placeholder={`Explica detalladamente qué hacer en el paso ${step.stepNumber}...`}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-hidden"
                />

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500">Tiempo estimado (opcional):</span>
                  <input
                    type="number"
                    min="1"
                    value={step.estimatedMinutes || ''}
                    onChange={(e) =>
                      handleUpdateStep(
                        step.id,
                        'estimatedMinutes',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="min"
                    className="w-16 px-2 py-1 text-xs bg-white rounded-lg border border-neutral-200 text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Personal Notes */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-600" />
            Observaciones personales y notas
          </h3>
          <textarea
            rows={3}
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            placeholder="Consejos propios, trucos, modificaciones de cantidades o notas sobre el resultado..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition"
          />
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 py-3.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition active:scale-95 text-center flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>{initialRecipe ? 'Guardar Cambios' : 'Crear Receta Completa'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-2xl transition active:scale-95 text-center text-sm"
          >
            Guardar como Borrador
          </button>
        </div>
      </div>
    </div>
  );
};
