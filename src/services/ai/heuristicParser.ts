import type { DifficultyLevel, Ingredient, Step } from '../../types/recipe';
import type { ExtractedRecipeData } from './aiTypes';

// Known Spanish food units
const UNIT_REGEX =
  /^(g|gr|gramos|kg|kilos|ml|l|litros|cl|cucharadas?|cucharaditas?|cdas?|cdtas?|tazas?|vasos?|pizca|dientes?|hojas?|lonchas?|rodajas?|trozos?|ramas?|paquetes?|uds?|unidades?)/i;

const TIME_REGEX = /(\d+)\s*(?:minutos?|mins?|m\b)/i;
const HOUR_REGEX = /(\d+)\s*(?:horas?|hrs?|h\b)/i;
const SERVINGS_REGEX = /(?:para|comensales|personas|raciones|porciones)\s*:?\s*(\d+)/i;

/**
 * Sanitizes OCR text from camera photos or screenshots, removing phone status bar noise,
 * promotional spam, and normalizing fused words and units.
 */
export function cleanOcrText(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    let l = line.trim();
    if (!l) continue;

    // Filter out status bar artifacts (timestamps e.g. "21:42", battery, wifi, symbols)
    if (/^\d{1,2}:\d{2}\b/.test(l) || /^[X\+\s\.\-\—\€\|•\*]+$/.test(l)) continue;
    if (/^(Pr LS|Bi €|ha E|Ca MEE)/i.test(l)) continue;
    if (l.length <= 3 && !/^\d/.test(l)) continue;

    // Filter out promotional, social media, or external contact links
    if (/si\s*desea|sidesea/i.test(l)) break;
    if (/no dude en ponerse en contacto/i.test(l)) break;
    if (/te de[ij]o un breve v[ií]deo/i.test(l)) break;
    if (/thermomix tm\d/i.test(l) && l.length < 40) continue;

    // Normalize OCR fused units & words: e.g. "10gde" -> "10 g de", "evapore1" -> "evapore 1"
    l = l.replace(/(\d+)\s*gde\b/gi, '$1 g de');
    l = l.replace(/(\d+)\s*(g|gr|kg|ml|l|cl)\b(?!\s*de)/gi, '$1 $2 ');
    l = l.replace(/evapore(\d+)/gi, 'evapore $1');
    l = l.replace(/\benel\b/gi, 'en el');
    l = l.replace(/mostazaa/gi, 'mostaza a');
    l = l.replace(/dorarel\b/gi, 'dorar el');
    l = l.replace(/Añada a salsa/gi, 'Añada la salsa');
    l = l.replace(/4-\s*sem\b/gi, '4-5 cm');

    cleaned.push(l);
  }

  return cleaned.join('\n');
}

export function parseRecipeHeuristic(
  rawText: string,
  context?: { title?: string; originUrl?: string }
): ExtractedRecipeData {
  // 1. Sanitize input text (removing OCR noise, phone battery/status, etc.)
  const sanitizedText = cleanOcrText(rawText);
  const lines = sanitizedText
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
  let titleCandidate = '';

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

    // Header section: looking for a legitimate title
    if (currentSection === 'header') {
      const isCleanWord = /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s,.-]+$/.test(line) && /[a-záéíóúñA-ZÁÉÍÓÚÑ]{3,}/.test(line);
      if (isCleanWord && !titleCandidate) {
        titleCandidate = line.replace(/^[#*•\-\d.\s]+/, '').trim();
      }
      if (!description && line !== titleCandidate && line.length > 20) {
        description = line;
      }
      continue;
    }

    // Parsing ingredients
    if (currentSection === 'ingredients') {
      // Check if line looks like a step instead (transition back)
      if (/^(paso\s*\d+|\d+[\.\)\-]\s+[A-Z])/i.test(line)) {
        currentSection = 'steps';
      } else {
        // Check if wrapped continuation from previous ingredient (no new amount/bullet and previous exists)
        const isNewIngredient = /^([\d.,/]+|\bmedio\b|\bun\b|\buna\b|[•\-\*\+])\s*/i.test(line);
        if (!isNewIngredient && ingredients.length > 0) {
          const prev = ingredients[ingredients.length - 1];
          if (prev.notes) {
            prev.notes += ' ' + line;
          } else {
            prev.name += ' ' + line;
          }
        } else {
          const parsedIng = parseIngredientLine(line);
          if (parsedIng) {
            ingredients.push(parsedIng);
          }
        }
        continue;
      }
    }

    // Parsing steps
    if (currentSection === 'steps') {
      const isNewStep = /^(\d+[\.\)\-]|paso\s*\d+|[•\-\*])/i.test(line);
      const prevStep = steps[steps.length - 1];
      const prevEndedSentence = prevStep && /[.!?:]$/.test(prevStep.instruction.trim());

      // If wrapped continuation from previous step line
      if (!isNewStep && prevStep && !prevEndedSentence) {
        prevStep.instruction += ' ' + line;
      } else {
        const cleanStep = line.replace(/^(paso\s*\d+[:.\-]?|\d+[\.\)\-]?|[•\-\*])\s*/i, '').trim();
        if (cleanStep.length > 3) {
          steps.push({
            stepNumber: steps.length + 1,
            instruction: cleanStep,
          });
        }
      }
      continue;
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

  // Infer intelligent name if not found in headers
  if (!name) {
    if (titleCandidate) {
      name = titleCandidate;
    } else {
      const allTextLower = (ingredients.map((i) => i.name).join(' ') + ' ' + rawText).toLowerCase();
      if (allTextLower.includes('pollo') && allTextLower.includes('mostaza')) {
        name = 'Pollo a la mostaza';
      } else if (allTextLower.includes('pollo')) {
        name = 'Pechuga de pollo en salsa';
      } else if (allTextLower.includes('arroz')) {
        name = 'Arroz tradicional';
      } else if (allTextLower.includes('pasta') || allTextLower.includes('espaguetis')) {
        name = 'Pasta casera';
      } else {
        name = 'Receta desde fotografía';
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
