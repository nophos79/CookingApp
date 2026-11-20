import type { AISettings, ExtractedRecipeData } from './aiTypes';
import { parseRecipeHeuristic } from './heuristicParser';
import { extractWithGemini } from './geminiProvider';

const SETTINGS_KEY = 'mi_recetario_ai_settings';

export const aiService = {
  getSettings(): AISettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed: AISettings = JSON.parse(stored);
        // If a valid Gemini key is present, default provider to gemini
        if (parsed.geminiApiKey?.trim() && !parsed.provider) {
          parsed.provider = 'gemini';
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error al leer configuración de IA:', e);
    }
    return {
      provider: 'heuristic',
    };
  },

  saveSettings(settings: AISettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  async extractRecipe(
    rawText: string,
    context?: { title?: string; originUrl?: string; author?: string; generateFromTitleIfEmpty?: boolean }
  ): Promise<ExtractedRecipeData> {
    const settings = this.getSettings();
    const hasKey = !!settings.geminiApiKey?.trim();

    // 1. If Gemini is selected OR an API key is available, use Gemini
    if (settings.provider === 'gemini' || hasKey) {
      if (!hasKey) {
        throw new Error(
          'Has seleccionado el motor Gemini pero no has introducido tu clave API. Configúrala en Ajustes (icono de engranaje).'
        );
      }
      return await extractWithGemini(rawText, settings.geminiApiKey!.trim(), {
        ...context,
        modelOverride: settings.geminiModel,
      });
    }

    // 2. Local heuristic parser fallback
    const hasText = !!rawText && rawText.trim().length > 25 && rawText !== context?.originUrl;
    if (!hasText) {
      throw new Error(
        'Para extraer automáticamente a partir de un enlace de YouTube necesitas configurar tu clave gratuita de Gemini en Ajustes (icono ⚙ arriba a la derecha). Alternativamente, puedes pegar la transcripción o notas en el desplegable.'
      );
    }

    return parseRecipeHeuristic(rawText, context);
  },
};
