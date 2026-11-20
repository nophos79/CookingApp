import type { DifficultyLevel, Ingredient, Step } from '../../types/recipe';

export type AIProviderType = 'heuristic' | 'gemini' | 'openai';

export interface AISettings {
  provider: AIProviderType;
  geminiApiKey?: string;
  geminiModel?: string; // e.g. 'auto', 'gemini-2.0-flash', etc.
  openaiApiKey?: string;
  openaiModel?: string; // e.g. gpt-4o-mini
}

export interface ExtractedRecipeData {
  name?: string;
  description?: string;
  categoryId?: string;
  subcategory?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  ingredients: Array<Omit<Ingredient, 'id'>>;
  steps: Array<Omit<Step, 'id'>>;
  personalNotes?: string;
  confidenceNotes?: string;
  aiAssisted: boolean;
}
