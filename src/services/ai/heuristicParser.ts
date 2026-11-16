import type { DifficultyLevel, Ingredient, Step } from '../../types/recipe';
import type { ExtractedRecipeData } from './aiTypes';

// Known Spanish food units
const UNIT_REGEX =
  /^(g|gr|gramos|kg|kilos|ml|l|litros|cl|cucharadas?|cucharaditas?|cdas?|cdtas?|tazas?|vasos?|pizca|dientes?|hojas?|lonchas?|rodajas?|trozos?|ramas?|paquetes?|uds?|unidades?)/i;

const TIME_REGEX = /(\d+)\s*(?:minutos?|mins?|m\b)/i;
const HOUR_REGEX = /(\d+)\s*(?:horas?|hrs?|h\b)/i;
const SERVINGS_REGEX = /(?:para|comensales|personas|raciones|porciones)\s*:?\s*(\d+)/i;

export function parseRecipeHeuristic(
  rawText: string,
  context?: { title?: string; originUrl?: string }
): ExtractedRecipeData {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let name = context?.title || '';
  let description = '';
  const ingredients: Array<Omit<Ingredient, 'id'>> = [];
  const steps: Array<Omit<Step, 'id'>> = [];
  let prepTimeMinutes: number | undefined;
  let cookTimeMinutes: number | undefined;
  let servings: number | undefined;
  let difficulty: DifficultyLevel = 'fácil';
  const tags: string[] = [];

  // If no title was provided in context, pick first clean heading or line
  if (!name && lines.length > 0) {
    name = lines[0].replace(/^[#*•\-\d.\s]+/, '');
  }

  // Detect servings from text
  const servingsMatch = rawText.match(SERVINGS_REGEX);
  if (servingsMatch) {
    servings = parseInt(servingsMatch[1], 10);
  }

  // Detect time
  const timeMatch = rawText.match(TIME_REGEX);
  if (timeMatch) {
    prepTimeMinutes = parseInt(timeMatch[1], 10);
  }
  const hourMatch = rawText.match(HOUR_REGEX);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    cookTimeMinutes = hours * 60;
  }

  // State machine for sections
  let currentSection: 'header' | 'ingredients' | 'steps' | 'notes' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Section header detection
    if (
      lower.includes('ingrediente') ||
      lower.startsWith('para la masa') ||
      lower.startsWith('para el relleno') ||
      lower.startsWith('lo que necesitas')
    ) {
      currentSection = 'ingredients';
      continue;
    }

    if (
      lower.includes('elaboración') ||
      lower.includes('elaboracion') ||
      lower.includes('preparación') ||
      lower.includes('preparacion') ||
      lower.includes('instrucciones') ||
      lower.includes('cómo se hace') ||
      lower.includes('paso a paso')
    ) {
      currentSection = 'steps';
      continue;
    }

    if (
      lower.includes('notas:') ||
      lower.includes('consejos:') ||
      lower.includes('truco') ||
      lower.includes('observaciones')
    ) {
      currentSection = 'notes';
      continue;
    }

    // Parsing ingredients
    if (currentSection === 'ingredients') {
      // Check if line looks like a step instead (transition back)
      if (/^(paso\s*\d+|\d+[\.\)\-]\s+[A-Z])/i.test(line)) {
        currentSection = 'steps';
      } else {
        const parsedIng = parseIngredientLine(line);
        if (parsedIng) {
          ingredients.push(parsedIng);
          continue;
        }
      }
    }

    // Parsing steps
    if (currentSection === 'steps') {
      // Clean up bullet point or step numbering
      const cleanStep = line.replace(/^(paso\s*\d+[:.\-]?|\d+[\.\)\-]?|[•\-\*])\s*/i, '').trim();
      if (cleanStep.length > 5) {
        steps.push({
          stepNumber: steps.length + 1,
          instruction: cleanStep,
        });
      }
      continue;
    }

    // Capture first short paragraph as description if in header
    if (currentSection === 'header' && !description && line !== name && line.length > 20) {
      description = line;
    }
  }

  // Fallback: If sections were not explicitly labeled with words like "Ingredientes" or "Pasos",
  // scan each line for ingredient characteristics or step characteristics
  if (ingredients.length === 0 && steps.length === 0) {
    for (const line of lines) {
      if (/^(\d+[\.\)]|paso\s*\d+)/i.test(line) || line.length > 80) {
        steps.push({
          stepNumber: steps.length + 1,
          instruction: line.replace(/^(\d+[\.\)]|paso\s*\d+[:.\-]?)\s*/i, ''),
        });
      } else {
        const ing = parseIngredientLine(line);
        if (ing) ingredients.push(ing);
      }
    }
  }

  // Category suggestion based on ingredients and name
  const categoryId = suggestCategory(name + ' ' + rawText);

  // Difficulty heuristic
  if (steps.length > 6 || (cookTimeMinutes && cookTimeMinutes > 60)) {
    difficulty = 'media';
  }
  if (steps.length > 10 || (cookTimeMinutes && cookTimeMinutes > 120)) {
    difficulty = 'difícil';
  }

  return {
    name: name || 'Receta extraída',
    description: description || undefined,
    categoryId,
    prepTimeMinutes: prepTimeMinutes || 15,
    cookTimeMinutes: cookTimeMinutes || 20,
    servings: servings || 4,
    difficulty,
    tags,
    ingredients,
    steps,
    aiAssisted: false,
    confidenceNotes: 'Estructurado mediante reglas heurísticas locales sin coste.',
  };
}

function parseIngredientLine(line: string): Omit<Ingredient, 'id'> | null {
  const clean = line.replace(/^[•\-\*\+]\s*/, '').trim();
  if (!clean || clean.length < 2) return null;

  // Regex to match quantity, unit, and item: e.g. "500 g de harina" or "2 huevos" or "1/2 vaso de leche"
  const match = clean.match(/^([\d.,/]+|\bmedio\b|\bun\b|\buna\b)?\s*([a-záéíóúñ]+)?\s+(?:de\s+)?(.+)$/i);

  if (match) {
    let amount = match[1]?.trim() || '';
    let unit = match[2]?.trim() || '';
    let name = match[3]?.trim() || '';

    // Check if matched unit is actually an ingredient name (e.g., "2 huevos")
    if (unit && !UNIT_REGEX.test(unit)) {
      name = unit + ' ' + name;
      unit = '';
    }

    // Split optional notes in parentheses: e.g. "cebolla (picada fina)"
    const notesMatch = name.match(/^([^(]+)(?:\((.+)\))?$/);
    let notes: string | undefined;
    if (notesMatch && notesMatch[2]) {
      name = notesMatch[1].trim();
      notes = notesMatch[2].trim();
    }

    return {
      name: name || clean,
      amount: amount || undefined,
      unit: unit || undefined,
      notes,
    };
  }

  return {
    name: clean,
  };
}

function suggestCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('arroz') || t.includes('paella') || t.includes('risotto')) return 'arroces';
  if (
    t.includes('merluza') ||
    t.includes('atun') ||
    t.includes('atún') ||
    t.includes('salmón') ||
    t.includes('gambas') ||
    t.includes('calamar') ||
    t.includes('pescado')
  ) {
    return 'pescados-mariscos';
  }
  if (
    t.includes('pollo') ||
    t.includes('ternera') ||
    t.includes('cerdo') ||
    t.includes('carne') ||
    t.includes('costillas')
  ) {
    return 'carnes';
  }
  if (t.includes('pasta') || t.includes('espaguetis') || t.includes('macarrones') || t.includes('lasaña')) {
    return 'pastas';
  }
  if (t.includes('lentejas') || t.includes('garbanzos') || t.includes('alubias') || t.includes('judías blancas')) {
    return 'legumbres';
  }
  if (t.includes('tortilla') || t.includes('huevo') || t.includes('huevos') || t.includes('revuelto')) {
    return 'huevos';
  }
  if (t.includes('sopa') || t.includes('crema') || t.includes('caldo') || t.includes('gazpacho') || t.includes('salmorejo')) {
    return 'sopas-cremas';
  }
  if (
    t.includes('tarta') ||
    t.includes('bizcocho') ||
    t.includes('postre') ||
    t.includes('chocolate') ||
    t.includes('galletas') ||
    t.includes('azúcar')
  ) {
    return 'postres-reposteria';
  }
  if (t.includes('verdura') || t.includes('ensalada') || t.includes('berenjena') || t.includes('calabacín')) {
    return 'verduras-hortalizas';
  }
  return 'otros';
}
