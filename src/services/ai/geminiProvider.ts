import type { ExtractedRecipeData } from './aiTypes';

const SYSTEM_INSTRUCTION = `Eres un extractor gastronómico riguroso. Tu tarea es extraer la información de una receta a partir del texto o transcripción proporcionada.

REGLAS CRÍTICAS DE PRECISIÓN:
1. NO inventes ingredientes, cantidades o tiempos que no estén explícitamente respaldados por el texto proporcionado.
2. Si una cantidad o tiempo no se menciona, deja el campo vacío o indica desconocido.
3. Devuelve SIEMPRE y ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "name": "Nombre exacto de la receta",
  "description": "Breve descripción de 1 o 2 frases",
  "categoryId": "Uno de: carnes, pescados-mariscos, arroces, pastas, verduras-hortalizas, legumbres, huevos, sopas-cremas, postres-reposteria, salsas-acompanamientos, otros",
  "subcategory": "Subcategoría opcional si aplica",
  "prepTimeMinutes": número_entero_o_null,
  "cookTimeMinutes": número_entero_o_null,
  "servings": número_entero_o_null,
  "difficulty": "fácil" | "media" | "difícil",
  "tags": ["etiqueta1", "etiqueta2"],
  "ingredients": [
    {
      "name": "Nombre del ingrediente",
      "amount": "Cantidad (ej: 500, 2, 1/2)",
      "unit": "Unidad (ej: g, ml, cda, ud)",
      "notes": "Observaciones opcionales (ej: cortado fino)"
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Instrucción clara y ordenada del paso",
      "estimatedMinutes": número_o_null
    }
  ],
  "personalNotes": "Consejos o trucos mencionados en el texto fuente"
}`;

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  context?: { title?: string; originUrl?: string }
): Promise<ExtractedRecipeData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Contexto adicional (si existe): Título: "${context?.title || ''}", URL: "${context?.originUrl || ''}".

Texto fuente / Transcripción de la receta:
${rawText}

Extrae la receta estructurada en formato JSON estricto siguiendo las instrucciones.`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Error en la API de Gemini (Código ${response.status})`
    );
  }

  const json = await response.json();
  const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('La IA no devolvió contenido.');
  }

  const parsed = JSON.parse(textOutput);

  return {
    name: parsed.name || context?.title || 'Receta extraída',
    description: parsed.description || undefined,
    categoryId: parsed.categoryId || 'otros',
    subcategory: parsed.subcategory || undefined,
    prepTimeMinutes: parsed.prepTimeMinutes || undefined,
    cookTimeMinutes: parsed.cookTimeMinutes || undefined,
    servings: parsed.servings || undefined,
    difficulty: parsed.difficulty || 'fácil',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    personalNotes: parsed.personalNotes || undefined,
    confidenceNotes: 'Estructurado con Google Gemini 1.5 Flash.',
    aiAssisted: true,
  };
}
