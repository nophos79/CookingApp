import type { ExtractedRecipeData } from './aiTypes';

const SYSTEM_INSTRUCTION = `Eres un extractor gastronómico profesional y riguroso. Tu tarea es extraer la información completa de una receta (ingredientes con sus cantidades y unidades, tiempos, comensales y pasos de elaboración ordenados).

REGLAS CRÍTICAS DE PRECISIÓN:
1. Si tienes una URL de un vídeo de YouTube o receta web, busca e investiga los ingredientes reales, cantidades y pasos que explica el autor.
2. Si un dato no se menciona en absoluto, déjalo vacío o indica desconocido.
3. Devuelve SIEMPRE un objeto JSON con la siguiente estructura:
{
  "name": "Nombre de la receta",
  "description": "Breve descripción de 1 o 2 frases",
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
      "instruction": "Instrucción clara y ordenada del paso",
      "estimatedMinutes": número_o_null
    }
  ],
  "personalNotes": "Consejos o trucos mencionados por el autor"
}`;

function parseJsonSafe(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) {
      return JSON.parse(codeBlock[1].trim());
    }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(text.substring(first, last + 1));
    }
    throw new Error('No se pudo interpretar la respuesta de la IA como JSON estructurado.');
  }
}

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  context?: { title?: string; originUrl?: string; generateFromTitleIfEmpty?: boolean }
): Promise<ExtractedRecipeData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const hasOriginUrl = !!context?.originUrl && context.originUrl.startsWith('http');
  const hasText = !!rawText && rawText.trim().length > 30;

  let prompt = '';
  if (hasOriginUrl && !hasText) {
    prompt = `Por favor, investiga y analiza la receta de este enlace web o vídeo de YouTube:
URL: ${context.originUrl}
${context.title ? `Título: "${context.title}"` : ''}

Utiliza el buscador de Google para encontrar los ingredientes exactos, cantidades, medidas y pasos de preparación que se explican en este vídeo o enlace.
Devuelve los datos de la receta en formato JSON siguiendo estrictamente las instrucciones del sistema.`;
  } else if (hasOriginUrl && hasText) {
    prompt = `Enlace original: ${context.originUrl}
${context.title ? `Título: "${context.title}"` : ''}

Texto / Transcripción proporcionada:
${rawText}

Extrae los ingredientes con sus cantidades y los pasos ordenados en formato JSON estricto.`;
  } else {
    prompt = `Texto de la receta a procesar:
${rawText || context?.title || ''}

Extrae los ingredientes con sus cantidades y los pasos ordenados en formato JSON estricto.`;
  }

  // Attempt 1: With Google Search Grounding tool (ideal for YouTube & recipe URLs)
  try {
    const bodyWithSearch: any = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: { temperature: 0.2 },
    };

    if (hasOriginUrl && !hasText) {
      bodyWithSearch.tools = [{ googleSearch: {} }];
    } else {
      bodyWithSearch.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithSearch),
    });

    if (response.ok) {
      const json = await response.json();
      const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        const parsed = parseJsonSafe(textOutput);
        return formatExtractedData(parsed, context);
      }
    }
  } catch (err) {
    console.warn('Intento con Search Grounding falló, reintentando modo directo:', err);
  }

  // Attempt 2: Standard JSON mode fallback
  const fallbackBody = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const fbResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fallbackBody),
  });

  if (!fbResponse.ok) {
    const errorData = await fbResponse.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Error en la API de Gemini (Código ${fbResponse.status})`
    );
  }

  const fbJson = await fbResponse.json();
  const fbText = fbJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!fbText) {
    throw new Error('La IA no devolvió contenido.');
  }

  const parsed = parseJsonSafe(fbText);
  return formatExtractedData(parsed, context);
}

function formatExtractedData(parsed: any, context?: { title?: string }): ExtractedRecipeData {
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
    confidenceNotes: 'Estructurado automáticamente con Google Gemini 1.5 Flash.',
    aiAssisted: true,
  };
}
