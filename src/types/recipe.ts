export type OriginType = 'youtube' | 'instagram' | 'tiktok' | 'web' | 'photo' | 'manual';

export type OriginStatus = 'pending' | 'available' | 'unavailable';

export type DifficultyLevel = 'fácil' | 'media' | 'difícil';

export interface RecipeOrigin {
  type: OriginType;
  originalUrl?: string;
  author?: string;
  addedAt: string;
  status: OriginStatus;
}

export interface Ingredient {
  id: string;
  name: string;
  amount?: string;
  unit?: string;
  notes?: string;
}

export interface Step {
  id: string;
  stepNumber: number;
  instruction: string;
  photoUrl?: string; // Stored as base64 or blob URL
  estimatedMinutes?: number;
}

export interface Category {
  id: string;
  name: string;
  iconName?: string;
  isCustom?: boolean;
  order?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategory?: string;
  mainPhoto?: string; // Stored locally as base64/blob
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty: DifficultyLevel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isDraft?: boolean;
  aiGenerated?: boolean;
  
  // Structured origin
  origin: RecipeOrigin;
  
  // Ingredients & Steps
  ingredients: Ingredient[];
  steps: Step[];
  
  // Personal observations
  personalNotes?: string;
}

export interface RecipeFilter {
  query?: string;
  categoryId?: string;
  onlyFavorites?: boolean;
  originType?: OriginType;
  maxTimeMinutes?: number;
  onlyDrafts?: boolean;
}
