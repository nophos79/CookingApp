import type { AISettings, ExtractedRecipeData } from './aiTypes';
import { parseRecipeHeuristic } from './heuristicParser';
import { extractWithGemini } from './geminiProvider';

const SETTINGS_KEY = 'mi_recetario_ai_settings';

export const aiService = {
  getSettings(): AISettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error al leer configuración de IA:', e);
    }
    // Default provider is 100% free local heuristics without any API key!
    return {
      provider: 'heuristic',
    };
  },

  saveSettings(settings: AISettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  async extractRecipe(
    rawText: string,
    context?: { title?: string; originUrl?: string; generateFromTitleIfEmpty?: boolean }
  ): Promise<ExtractedRecipeData> {
    const settings = this.getSettings();

    // 1. If user configured Gemini and has an API Key
    if (settings.provider === 'gemini' && settings.geminiApiKey?.trim()) {
      try {
        return await extractWithGemini(rawText, settings.geminiApiKey.trim(), context);
      } catch (err: any) {
        console.warn('Fallo en Gemini, recurriendo al extractor heurístico:', err);
        // Seamless fallback to heuristic parser if API fails or quota exceeded
        const fallback = parseRecipeHeuristic(rawText, context);
        fallback.confidenceNotes = `Nota: La llamada a Gemini falló (${err.message}). Se usó el extractor local sin coste.`;
        return fallback;
      }
    }

    // 2. Default: 100% free local heuristic parser
    return parseRecipeHeuristic(rawText, context);
  },
};
