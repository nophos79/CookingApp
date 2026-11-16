import Dexie, { type Table } from 'dexie';
import type { Category, Recipe } from '../types/recipe';

export class CookingAppDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  categories!: Table<Category, string>;

  constructor() {
    super('MiRecetarioDB');
    this.version(1).stores({
      recipes: 'id, name, categoryId, isFavorite, createdAt, updatedAt, [categoryId+isFavorite]',
      categories: 'id, name, order',
    });
  }
}

export const db = new CookingAppDatabase();
