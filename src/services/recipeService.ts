import { db } from '../db/database';
import type { Category, Recipe, RecipeFilter } from '../types/recipe';
import { googleDriveService } from './drive/googleDriveService';

export const recipeService = {
  // Helper to sync to Drive in background if mode is hybrid or drive-only
  triggerAutoSyncIfEnabled() {
    const cfg = googleDriveService.getConfig();
    if (cfg.storageMode !== 'local-only' && googleDriveService.isConnected()) {
      googleDriveService.uploadToDrive().catch((err) => console.warn('Auto-sync a Google Drive falló:', err));
    }
  },

  // Get all recipes
  async getAll(): Promise<Recipe[]> {
    return await db.recipes.orderBy('createdAt').reverse().toArray();
  },

  // Get recipe by ID
  async getById(id: string): Promise<Recipe | undefined> {
    return await db.recipes.get(id);
  },

  // Save new recipe
  async create(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const newRecipe: Recipe = {
      ...recipe,
      id: 'receta_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.recipes.add(newRecipe);
    this.triggerAutoSyncIfEnabled();
    return newRecipe;
  },

  // Update existing recipe
  async update(id: string, updates: Partial<Recipe>): Promise<void> {
    await db.recipes.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.triggerAutoSyncIfEnabled();
  },

  // Toggle favorite
  async toggleFavorite(id: string): Promise<boolean> {
    const recipe = await db.recipes.get(id);
    if (!recipe) throw new Error('Receta no encontrada');
    const newState = !recipe.isFavorite;
    await db.recipes.update(id, { isFavorite: newState, updatedAt: new Date().toISOString() });
    this.triggerAutoSyncIfEnabled();
    return newState;
  },

  // Delete recipe
  async delete(id: string): Promise<void> {
    googleDriveService.recordDeletedId(id);
    await db.recipes.delete(id);
    this.triggerAutoSyncIfEnabled();
  },

  // Search and filter recipes
  async search(filter: RecipeFilter): Promise<Recipe[]> {
    let collection = db.recipes.toCollection();

    let results = await collection.toArray();

    // Query text match (name, description, ingredients, tags, author)
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const authorMatch = r.origin?.author?.toLowerCase().includes(q);
        const tagMatch = r.tags?.some((t) => t.toLowerCase().includes(q));
        const ingMatch = r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
        return nameMatch || descMatch || authorMatch || tagMatch || ingMatch;
      });
    }

    // Category filter
    if (filter.categoryId && filter.categoryId !== 'all') {
      results = results.filter((r) => r.categoryId === filter.categoryId);
    }

    // Favorite filter
    if (filter.onlyFavorites) {
      results = results.filter((r) => r.isFavorite);
    }

    // Origin type filter
    if (filter.originType) {
      results = results.filter((r) => r.origin?.type === filter.originType);
    }

    // Max prep/cook time
    if (filter.maxTimeMinutes && filter.maxTimeMinutes > 0) {
      results = results.filter((r) => {
        const total = (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
        return total <= (filter.maxTimeMinutes || 9999);
      });
    }

    // Drafts
    if (filter.onlyDrafts) {
      results = results.filter((r) => r.isDraft);
    }

    // Sort by recent first
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.categories.orderBy('order').toArray();
  },

  async addCategory(name: string, iconName = 'Utensils'): Promise<Category> {
    const id = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const count = await db.categories.count();
    const newCat: Category = {
      id,
      name,
      iconName,
      isCustom: true,
      order: count + 1,
    };
    await db.categories.add(newCat);
    return newCat;
  },
};
