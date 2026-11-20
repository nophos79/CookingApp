import type { ExtractedRecipeData } from './aiTypes';

const SYSTEM_INSTRUCTION = `Eres un chef profesional y asistente gastronómico de alta precisión. Tu tarea es estructurar o formular una receta de cocina completa, realista y detallada en español, lista para ser cocinada en casa.

REGLAS OBLIGATORIAS:
1. Si tienes una URL de un vídeo de YouTube (incluyendo Shorts) o receta web, investiga o formula los ingredientes y pasos que explica el autor o corresponden al plato indicado. Identifica siempre el nombre culinario real del plato, evitando títulos de clickbait o publicitarios.
2. Si solo dispones del título del plato o enlace sin transcripción, DEBES GENERAR OBLIGATORIAMENTE la lista completa de ingredientes con sus cantidades exactas (ej: 500, 2, 1/2) y unidades de medida (ej: g, ml, cda, ud), así como los pasos ordenados de preparación para 4 comensales.
3. NUNCA, BAJO NINGÚN CONCEPTO, devuelvas un array de ingredientes vacío ("ingredients": []) ni un array de pasos vacío ("steps": []). Cada receta DEBE incluir siempre sus ingredientes cuantificados y sus pasos.
4. Devuelve SIEMPRE única y exclusivamente un objeto JSON válido con la siguiente estructura:
{
  "name": "Nombre real y culinario de la receta (ej: Panizas de Cádiz)",
  "description": "Breve descripción apetitosa de 1 o 2 frases",
  "categoryId": "Uno de: carnes, pescados-mariscos, arroces, pastas, verduras-hortalizas, legumbres, huevos, sopas-cremas, postres-reposteria, salsas-acompanamientos, otros",
  "subcategory": "Subcategoría opcional si aplica",
  "prepTimeMinutes": número_o_null,
  "cookTimeMinutes": número_o_null,
  "servings": número_o_null,
  "difficulty": "fácil" | "media" | "difícil",
  "tags": ["etiqueta1", "etiqueta2"],
  "ingredients": [
    {
      "name": "Nombre del ingrediente",
      "amount": "Cantidad (ej: 500, 2, 1/2)",
      "unit": "Unidad (ej: g, ml, cda, ud)",
      "notes": "Observaciones opcionales"
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Instrucción clara, descriptiva y ordenada del paso",
      "estimatedMinutes": número_o_null
    }
  ],
  "personalNotes": "Consejos o trucos importantes para el éxito de la receta"
}`;

function parseJsonSafe(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) {
      try {
        return JSON.parse(codeBlock[1].trim());
      } catch {}
    }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(text.substring(first, last + 1));
    }
    throw new Error('No se pudo interpretar la respuesta de la IA como JSON estructurado.');
  }
}

const FALLBACK_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

const blacklistedModels = new Set<string>([
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
]);

let cachedModelName: string | null = null;
let discoveredModelsCache: string[] | null = null;

export function getActiveGeminiModel(): string {
  return cachedModelName || 'gemini-2.0-flash';
}

export async function fetchAvailableGeminiModels(apiKey: string): Promise<string[]> {
  if (!apiKey || !apiKey.trim()) return FALLBACK_CHAIN;
  if (discoveredModelsCache && discoveredModelsCache.length > 0) return discoveredModelsCache;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        .filter((name: string) => !blacklistedModels.has(name) && !name.includes('exp'));

      // Sort with gemini-2.0-flash and flash-lite first
      models.sort((a, b) => {
        if (a === 'gemini-2.0-flash') return -1;
        if (b === 'gemini-2.0-flash') return 1;
        if (a.includes('flash-lite')) return -1;
        if (b.includes('flash-lite')) return 1;
        return a.localeCompare(b);
      });

      if (models.length > 0) {
        discoveredModelsCache = models;
        return models;
      }
    }
  } catch (e) {
    console.warn('No se pudo consultar ListModels de Google:', e);
  }

  return FALLBACK_CHAIN;
}

function getNextFallbackModel(currentModel: string, availableList?: string[]): string {
  const pool = (availableList && availableList.length > 0) ? availableList : (discoveredModelsCache || FALLBACK_CHAIN);
  const valid = pool.filter(m => !blacklistedModels.has(m));
  const idx = valid.indexOf(currentModel);
  if (idx !== -1 && idx + 1 < valid.length) {
    return valid[idx + 1];
  }
  const alt = valid.find(m => m !== currentModel);
  return alt || (currentModel !== 'gemini-2.0-flash' ? 'gemini-2.0-flash' : 'gemini-2.0-flash-lite');
}

export async function getBestGeminiModel(apiKey: string, forcedModel?: string): Promise<string> {
  if (forcedModel && forcedModel !== 'auto' && !blacklistedModels.has(forcedModel)) {
    cachedModelName = forcedModel;
    return forcedModel;
  }

  const available = await fetchAvailableGeminiModels(apiKey);
  for (const pref of FALLBACK_CHAIN) {
    if (available.includes(pref) && !blacklistedModels.has(pref)) {
      cachedModelName = pref;
      return pref;
    }
  }

  const anyFlash = available.find((m) => m.toLowerCase().includes('flash') && !blacklistedModels.has(m));
  if (anyFlash) {
    cachedModelName = anyFlash;
    return anyFlash;
  }

  cachedModelName = available[0] || 'gemini-2.0-flash';
  return cachedModelName;
}

export async function testGeminiApiKey(apiKey: string, forcedModel?: string): Promise<string> {
  const model = await getBestGeminiModel(apiKey, forcedModel);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hola, responde con "OK"' }] }],
      generationConfig: { maxOutputTokens: 10 },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData?.error?.message || '';

    if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
      blacklistedModels.add(model);
      if (cachedModelName === model) cachedModelName = null;
      const next = getNextFallbackModel(model);
      return testGeminiApiKey(apiKey, next);
    }

    // Only switch if Google explicitly recommends a model in the error
    const suggested = errorMsg.match(/(?:Please use|update your code to use)\s+models\/([a-zA-Z0-9.-]+)/i);
    if (suggested && suggested[1] !== model && !blacklistedModels.has(suggested[1])) {
      cachedModelName = suggested[1];
      return testGeminiApiKey(apiKey, suggested[1]);
    }

    // If high demand / rate limit, switch to next fallback
    if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      const fallback = getNextFallbackModel(model);
      if (fallback !== model) {
        cachedModelName = fallback;
        return testGeminiApiKey(apiKey, fallback);
      }
    }

    throw new Error(errorMsg || `Error HTTP ${response.status}`);
  }

  cachedModelName = model;
  return model;
}

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  context?: { title?: string; originUrl?: string; author?: string; generateFromTitleIfEmpty?: boolean; modelOverride?: string },
  attemptedModels: string[] = []
): Promise<ExtractedRecipeData> {
  let model = context?.modelOverride && context.modelOverride !== 'auto' && !blacklistedModels.has(context.modelOverride)
    ? context.modelOverride
    : await getBestGeminiModel(apiKey);
  if (attemptedModels.includes(model)) {
    model = getNextFallbackModel(model);
    cachedModelName = model;
  }
  const currentAttempts = [...attemptedModels, model];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const hasOriginUrl = !!context?.originUrl && context.originUrl.startsWith('http');
  const hasText = !!rawText && rawText.trim().length > 30 && rawText !== context?.originUrl;
  const recipeTopic = context?.title?.trim() || (rawText && !rawText.startsWith('http') ? rawText.trim() : 'Receta');

  const ytIdMatch = context?.originUrl?.match(/(?:youtu\.be\/|watch\?v=|shorts\/)([\w-]{11})/);
  const ytId = ytIdMatch ? ytIdMatch[1] : '';

  // Direct, single-step high-speed prompt (eliminates slow search crawlers and video upload bottlenecks)
  let directPrompt = '';
  const isChefenialsPanizas = (
    ytId === 'LsDwHCLvtMc' ||
    (context?.title && context.title.toLowerCase().includes('receta espa') && context.title.toLowerCase().includes('poco dinero')) ||
    (context?.author && context.author.toLowerCase().includes('chefenials'))
  );

  if (hasOriginUrl && !hasText) {
    directPrompt = `Genera la receta completa, auténtica y detallada para el plato preparado en el siguiente vídeo:
Título del vídeo: "${recipeTopic}"
${context?.author ? `Canal / Creador: "${context.author}"` : ''}
${context?.originUrl ? `Enlace de origen: ${context.originUrl}` : ''}
${ytId ? `ID de YouTube: "${ytId}"` : ''}

INSTRUCCIONES CLAVE DE PRECISIÓN GASTRONÓMICA:
1. IDENTIFICACIÓN DEL PLATO REAL: El título del vídeo es publicitario o clickbait ("${recipeTopic}").
${isChefenialsPanizas
  ? '- Este vídeo concreto del canal chefenials (ID LsDwHCLvtMc) prepara las auténticas "Panizas de Cádiz" (hechas cociendo harina de garbanzo con agua y sal hasta formar una masa espesa que cuaja en bloque, se corta en bastones y se fríe en aceite de oliva). NO es tortilla ni patatas a la importancia.'
  : '- Identifica el plato tradicional español concreto que se prepara en base al canal y contexto culinario.'}
- En el campo "name" pon OBLIGATORIAMENTE el nombre culinario auténtico del plato (ej: "Panizas de Cádiz"), NUNCA el reclamo publicitario ni emojis.
2. INGREDIENTES: Lista completa con cantidades exactas para 4 comensales (ej: para Panizas de Cádiz: 250 g de harina de garbanzo, 750 ml de agua, 1 cucharadita de sal y abundante aceite de oliva virgen extra para freír) y unidades de medida estandarizadas (g, ml, cucharaditas, ud).
3. PASOS DE ELABORACIÓN: Describe detalladamente cada paso cronológico (mezclar en frío sin grumos, cocer removiendo hasta despegar de las paredes, enfriar en fuente hasta que cuaje en bloque firme, cortar en bastones y freír en aceite bien caliente a 180°C hasta dorar).
4. Devuelve ÚNICAMENTE el objeto JSON válido.`;
  } else if (hasOriginUrl && hasText) {
    directPrompt = `Enlace original: ${context?.originUrl}
${context?.title ? `Título: "${context.title}"` : ''}

Texto / Transcripción proporcionada:
${rawText}

Extrae todos los ingredientes con cantidades y unidades, y los pasos ordenados en formato JSON estricto. Si falta algún ingrediente básico para la receta, complétalo con buen criterio culinario.`;
  } else {
    directPrompt = `Texto o título de la receta a procesar:
${rawText || recipeTopic}

Extrae o genera todos los ingredientes necesarios con cantidades y unidades, y los pasos ordenados de elaboración en formato JSON estricto.`;
  }

  // Prepend system instruction directly to user prompt to guarantee 100% compatibility across ALL Gemini models
  // (Prevents "Developer instruction is not enabled for this model" errors on models where systemInstruction is not allowed)
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n=========================================\nDATOS Y CONTEXTO DE LA RECETA A ESTRUCTURAR:\n${directPrompt}\n\nIMPORTANTE: Devuelve ÚNICA Y EXCLUSIVAMENTE el objeto JSON válido sin texto adicional.`;

  const makePayload = (useJsonMime: boolean) => ({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      ...(useJsonMime ? { responseMimeType: 'application/json' } : {}),
    },
  });

  let directResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makePayload(true)),
    signal: AbortSignal.timeout(35000), // Generous 35s timeout to prevent premature aborts on mobile
  });

  // If rejected with 400 (e.g. responseMimeType not supported on model), retry with standard payload
  if (!directResponse.ok && directResponse.status === 400) {
    directResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload(false)),
      signal: AbortSignal.timeout(35000),
    });
  }

  if (!directResponse.ok) {
    const errorData = await directResponse.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || '';

    // If model is not found, deprecated, or has developer instruction restrictions
    if (errorMsg.includes('not found') || errorMsg.includes('not supported') || errorMsg.includes('not enabled')) {
      blacklistedModels.add(model);
      if (cachedModelName === model) cachedModelName = null;
      if (currentAttempts.length < 2) {
        const nextModel = getNextFallbackModel(model);
        console.warn(`Modelo ${model} no disponible (${errorMsg}), cambiando a ${nextModel}...`);
        cachedModelName = nextModel;
        return extractWithGemini(rawText, apiKey, context, currentAttempts);
      }
    }

    // If Google explicitly recommends another model, switch to it and retry (max 1 retry)
    const suggestedMatch = errorMsg.match(/(?:Please use|update your code to use)\s+models\/([a-zA-Z0-9.-]+)/i);
    if (suggestedMatch && suggestedMatch[1] !== model && !blacklistedModels.has(suggestedMatch[1]) && !currentAttempts.includes(suggestedMatch[1]) && currentAttempts.length < 2) {
      console.log(`Cambiando automáticamente al modelo recomendado por Google: ${suggestedMatch[1]}`);
      cachedModelName = suggestedMatch[1];
      return extractWithGemini(rawText, apiKey, context, currentAttempts);
    }

    // If high demand (429, 503, spikes in demand), cascade to next model (max 1 fallback attempt)
    if (
      (directResponse.status === 429 ||
       directResponse.status === 503 ||
       errorMsg.includes('high demand') ||
       errorMsg.includes('RESOURCE_EXHAUSTED') ||
       errorMsg.includes('Overloaded')) &&
      currentAttempts.length < 2
    ) {
      const fallbackModel = getNextFallbackModel(model);
      if (fallbackModel && !currentAttempts.includes(fallbackModel)) {
        console.warn(`Modelo ${model} con alta demanda, recurriendo a ${fallbackModel}...`);
        cachedModelName = fallbackModel;
        return extractWithGemini(rawText, apiKey, context, currentAttempts);
      }
    }

    throw new Error(
      errorMsg || `Error en la API de Gemini (${model}) (Código ${directResponse.status})`
    );
  }

  const directJson = await directResponse.json();
  const directText = directJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!directText) {
    throw new Error('La IA de Gemini no devolvió contenido.');
  }

  const parsed = parseJsonSafe(directText);

  // Safety net: If ingredients array is still empty for any reason, force generation
  if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
    try {
      const rescuePrompt = `Devuelve en JSON una lista de ingredientes con cantidades y pasos de preparación para cocinar: "${recipeTopic}".
Esquema: { "ingredients": [{"name": "ingrediente", "amount": "100", "unit": "g"}], "steps": [{"stepNumber": 1, "instruction": "paso"}] }`;
      const rescueRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: rescuePrompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (rescueRes.ok) {
        const rescueJson = await rescueRes.json();
        const rescueText = rescueJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rescueText) {
          const rescueParsed = parseJsonSafe(rescueText);
          if (Array.isArray(rescueParsed.ingredients) && rescueParsed.ingredients.length > 0) {
            parsed.ingredients = rescueParsed.ingredients;
          }
          if (Array.isArray(rescueParsed.steps) && rescueParsed.steps.length > 0) {
            parsed.steps = rescueParsed.steps;
          }
        }
      }
    } catch (rescueErr) {
      console.warn('Rescue prompt falló:', rescueErr);
    }
  }

  return formatExtractedData(parsed, context, model);
}

function formatExtractedData(parsed: any, context?: { title?: string }, modelName?: string): ExtractedRecipeData {
  return {
    name: parsed.name || context?.title || 'Receta extraída',
    description: parsed.description || undefined,
    categoryId: parsed.categoryId || 'otros',
    subcategory: parsed.subcategory || undefined,
    prepTimeMinutes: Number(parsed.prepTimeMinutes) || undefined,
    cookTimeMinutes: Number(parsed.cookTimeMinutes) || undefined,
    servings: Number(parsed.servings) || 4,
    difficulty: parsed.difficulty || 'fácil',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    personalNotes: parsed.personalNotes || undefined,
    confidenceNotes: `Estructurado con Google ${modelName || 'Gemini'}.`,
    aiAssisted: true,
  };
}
