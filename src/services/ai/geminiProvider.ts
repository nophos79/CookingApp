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
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-3.8-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
];

function getNextFallbackModel(currentModel: string): string {
  const idx = FALLBACK_CHAIN.indexOf(currentModel);
  if (idx !== -1 && idx + 1 < FALLBACK_CHAIN.length) {
    return FALLBACK_CHAIN[idx + 1];
  }
  return currentModel !== 'gemini-2.0-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
}

let cachedModelName: string | null = null;

export function getActiveGeminiModel(): string {
  return cachedModelName || 'gemini-2.0-flash';
}

export async function getBestGeminiModel(apiKey: string, forcedModel?: string): Promise<string> {
  if (forcedModel && forcedModel !== 'auto') {
    cachedModelName = forcedModel;
    return forcedModel;
  }
  if (cachedModelName) return cachedModelName;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        .filter((name: string) => !name.includes('2.5-flash')); // Exclude deprecated 2.5-flash

      for (const pref of FALLBACK_CHAIN) {
        if (availableModels.includes(pref)) {
          cachedModelName = pref;
          return pref;
        }
      }

      const anyFlash = availableModels.find((m) => m.toLowerCase().includes('flash'));
      if (anyFlash) {
        cachedModelName = anyFlash;
        return anyFlash;
      }
    }
  } catch (e) {
    console.warn('No se pudo listar modelos desde Google, probando gemini-2.0-flash:', e);
  }

  cachedModelName = 'gemini-2.0-flash';
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
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData?.error?.message || '';

    // If Google recommends a specific model, switch to it
    const suggested = errorMsg.match(/models\/([a-zA-Z0-9.-]+)/);
    if (suggested && suggested[1] !== model) {
      cachedModelName = suggested[1];
      return testGeminiApiKey(apiKey);
    }

    // If high demand / rate limit, switch to next fallback
    if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      const fallback = getNextFallbackModel(model);
      if (fallback !== model) {
        cachedModelName = fallback;
        return testGeminiApiKey(apiKey);
      }
    }

    throw new Error(errorMsg || `Error HTTP ${response.status}`);
  }

  return model;
}

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  context?: { title?: string; originUrl?: string; author?: string; generateFromTitleIfEmpty?: boolean; modelOverride?: string },
  attemptedModels: string[] = []
): Promise<ExtractedRecipeData> {
  let model = context?.modelOverride && context.modelOverride !== 'auto'
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

  let researchedContext = '';

  // Step 1: Web Research with Google Search Grounding to find actual video recipe
  if (hasOriginUrl && !hasText) {
    try {
      const searchPrompt = `Investiga a fondo este vídeo de cocina de YouTube / Shorts:
URL: ${context?.originUrl}
${context?.title ? `Título del vídeo: "${context.title}"` : ''}
${context?.author ? `Canal / Creador: "${context.author}"` : ''}

IMPORTANTE: El título del vídeo puede ser llamativo o de clickbait (ej: "esta receta te quita el hambre por poco dinero").
Averigua y detalla:
1. El NOMBRE CULINARIO REAL Y TRADICIONAL del plato preparado en el vídeo (por ejemplo: "Panizas de Cádiz", "Tortilla de patatas", etc.).
2. Todos los ingredientes exactos que utiliza el autor y sus medidas.
3. El proceso paso a paso que realiza en la cocina.`;

      const searchBody = {
        contents: [{ parts: [{ text: searchPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 },
      };

      const searchResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (searchResponse.ok) {
        const json = await searchResponse.json();
        const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          try {
            // If already returned valid JSON, use it directly!
            const parsed = parseJsonSafe(textOutput);
            if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
              return formatExtractedData(parsed, context, model);
            }
          } catch {
            // It's rich natural language research from Google Search! Save it for Step 2 structuring
            researchedContext = textOutput;
          }
        }
      }
    } catch (err) {
      console.warn('Búsqueda web con Google Search falló, recurriendo a generación directa:', err);
    }
  }

  // Step 2: High-Precision Structured JSON Generation
  let directPrompt = '';
  if (researchedContext) {
    directPrompt = `A partir de la siguiente investigación verídica realizada sobre el vídeo "${context?.title || ''}" del canal "${context?.author || ''}":

${researchedContext}

Extrae y estructura la receta completa real en formato JSON con todos sus ingredientes con cantidades y unidades para 4 comensales, y todos los pasos ordenados de elaboración.
REGLA CRÍTICA: En el campo "name" pon el nombre culinario auténtico del plato (por ejemplo "Panizas de Cádiz"), NUNCA el título publicitario o con emojis.`;
  } else if (hasOriginUrl && !hasText) {
    directPrompt = `Genera la receta completa, auténtica y detallada para el siguiente plato:
Título / Nombre: "${recipeTopic}"
${context?.author ? `Canal / Autor de referencia: "${context.author}"` : ''}
${context?.originUrl ? `Enlace de origen: ${context.originUrl}` : ''}

INSTRUCCIONES CLAVE:
1. Si el título parece un reclamo o no indica el plato claramente, deduce el plato tradicional español al que hace referencia el autor.
2. Formula una lista completa y realista de ingredientes con cantidades exactas para 4 comensales y unidades de medida claras (g, ml, cucharadas, unidades).
3. Desarrolla todos los pasos de elaboración cronológicos, detallando técnicas, temperaturas y tiempos para que quede perfecta.
4. Asigna la categoría culinaria adecuada y pon un nombre apetitoso y real en "name".
5. Devuelve ÚNICAMENTE el objeto JSON.`;
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

  const directBody = {
    contents: [{ parts: [{ text: directPrompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const directResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(directBody),
  });

  if (!directResponse.ok) {
    const errorData = await directResponse.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || '';

    // If Google recommends a specific model, switch to it and retry
    const suggestedMatch = errorMsg.match(/models\/([a-zA-Z0-9.-]+)/);
    if (suggestedMatch && suggestedMatch[1] !== model && !currentAttempts.includes(suggestedMatch[1])) {
      console.log(`Cambiando automáticamente al modelo recomendado por Google: ${suggestedMatch[1]}`);
      cachedModelName = suggestedMatch[1];
      return extractWithGemini(rawText, apiKey, context, currentAttempts);
    }

    // If high demand (429, 503, spikes in demand), cascade to the next model in the pool!
    if (
      directResponse.status === 429 ||
      directResponse.status === 503 ||
      errorMsg.includes('high demand') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('Overloaded')
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
          generationConfig: { responseMimeType: 'application/json' },
        }),
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
