import type { ExtractedRecipeData } from './aiTypes';

const SYSTEM_INSTRUCTION = `Eres un chef profesional y asistente gastronómico de alta precisión. Tu tarea es estructurar o formular una receta de cocina completa, realista y detallada en español, lista para ser cocinada en casa.

REGLAS OBLIGATORIAS:
1. Si tienes una URL de un vídeo de YouTube o receta web, utiliza los ingredientes y pasos que explica el autor o corresponden al plato indicado.
2. Si solo dispones del título del plato o enlace sin transcripción, DEBES GENERAR OBLIGATORIAMENTE la lista completa de ingredientes con sus cantidades exactas (ej: 500, 2, 1/2) y unidades de medida (ej: g, ml, cda, ud), así como los pasos ordenados de preparación para 4 comensales.
3. NUNCA, BAJO NINGÚN CONCEPTO, devuelvas un array de ingredientes vacío ("ingredients": []) ni un array de pasos vacío ("steps": []). Cada receta DEBE incluir siempre sus ingredientes cuantificados y sus pasos.
4. Devuelve SIEMPRE única y exclusivamente un objeto JSON válido con la siguiente estructura:
{
  "name": "Nombre de la receta",
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

let cachedModelName: string | null = null;

export async function getBestGeminiModel(apiKey: string): Promise<string> {
  if (cachedModelName) return cachedModelName;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        // Exclude deprecated models that reject new users
        .filter((name: string) => !name.includes('2.5-flash'));

      // Priority list: modern models first
      const preferred = [
        'gemini-3.8-flash',
        'gemini-3-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-flash-002',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      for (const pref of preferred) {
        if (availableModels.includes(pref)) {
          cachedModelName = pref;
          return pref;
        }
      }

      // If no exact match, pick any non-2.5 flash model
      const anyFlash = availableModels.find((m) => m.toLowerCase().includes('flash'));
      if (anyFlash) {
        cachedModelName = anyFlash;
        return anyFlash;
      }

      const anyGemini = availableModels.find((m) => m.toLowerCase().includes('gemini'));
      if (anyGemini) {
        cachedModelName = anyGemini;
        return anyGemini;
      }
    }
  } catch (e) {
    console.warn('No se pudo listar modelos desde Google, probando gemini-3.8-flash:', e);
  }

  // Modern default fallback
  cachedModelName = 'gemini-3.8-flash';
  return cachedModelName;
}

export async function testGeminiApiKey(apiKey: string): Promise<string> {
  const model = await getBestGeminiModel(apiKey);
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

    // If Google tells us to use a specific model (e.g. models/gemini-3.8-flash), auto-switch!
    const suggested = errorMsg.match(/models\/([a-zA-Z0-9.-]+)/);
    if (suggested && suggested[1] !== model) {
      cachedModelName = suggested[1];
      return testGeminiApiKey(apiKey);
    }

    throw new Error(errorMsg || `Error HTTP ${response.status}`);
  }

  return model;
}

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  context?: { title?: string; originUrl?: string; author?: string; generateFromTitleIfEmpty?: boolean }
): Promise<ExtractedRecipeData> {
  const model = await getBestGeminiModel(apiKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const hasOriginUrl = !!context?.originUrl && context.originUrl.startsWith('http');
  const hasText = !!rawText && rawText.trim().length > 30 && rawText !== context?.originUrl;
  const recipeTopic = context?.title?.trim() || (rawText && !rawText.startsWith('http') ? rawText.trim() : 'Receta');

  // Attempt 1: If it's a URL without raw text, try Google Search Grounding to find actual video recipe
  if (hasOriginUrl && !hasText) {
    try {
      const searchPrompt = `Investiga y analiza la receta correspondiente a este enlace de vídeo o cocina:
URL: ${context?.originUrl}
${context?.title ? `Título del vídeo: "${context.title}"` : ''}
${context?.author ? `Canal / Autor: "${context.author}"` : ''}

Por favor, busca en la web los ingredientes exactos (con cantidades y unidades) y los pasos de elaboración que se preparan en este vídeo.
Devuelve el resultado en formato JSON estricto con los campos: name, description, categoryId, prepTimeMinutes, cookTimeMinutes, servings, difficulty, tags, ingredients y steps.`;

      const searchBody = {
        contents: [{ parts: [{ text: searchPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (response.ok) {
        const json = await response.json();
        const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          const parsed = parseJsonSafe(textOutput);
          if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
            return formatExtractedData(parsed, context, model);
          }
        }
      }
    } catch (err) {
      console.warn('Búsqueda con Google Search falló o no dio ingredientes, recurriendo a generación directa:', err);
    }
  }

  // Attempt 2: Direct High-Quality Recipe Generation / Extraction in JSON Mode
  let directPrompt = '';
  if (hasOriginUrl && !hasText) {
    directPrompt = `Genera la receta completa, auténtica y detallada para el siguiente plato:
Título / Nombre: "${recipeTopic}"
${context?.author ? `Canal / Autor de referencia: "${context.author}"` : ''}
${context?.originUrl ? `Enlace de origen: ${context.originUrl}` : ''}

INSTRUCCIONES CLAVE:
1. Formula una lista completa y realista de ingredientes con cantidades exactas para 4 comensales y unidades de medida claras (g, ml, cucharadas, unidades).
2. Desarrolla todos los pasos de elaboración cronológicos, detallando técnicas, temperaturas y tiempos para que quede perfecta.
3. Asigna la categoría culinaria adecuada y tiempos aproximados de preparación y cocción.
4. Devuelve ÚNICAMENTE el objeto JSON.`;
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

    // If Google recommends a specific model (e.g. "use models/gemini-3.8-flash"), auto-switch and retry immediately!
    const suggestedMatch = errorMsg.match(/models\/([a-zA-Z0-9.-]+)/);
    if (suggestedMatch && suggestedMatch[1] !== model) {
      console.log(`Cambiando automáticamente al modelo recomendado por Google: ${suggestedMatch[1]}`);
      cachedModelName = suggestedMatch[1];
      return extractWithGemini(rawText, apiKey, context);
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
