import { db } from './database';
import type { Category, Recipe } from '../types/recipe';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'carnes', name: 'Carnes', iconName: 'Beef', order: 1 },
  { id: 'pescados-mariscos', name: 'Pescados y mariscos', iconName: 'Fish', order: 2 },
  { id: 'arroces', name: 'Arroces', iconName: 'Wheat', order: 3 },
  { id: 'pastas', name: 'Pastas', iconName: 'UtensilsCrossed', order: 4 },
  { id: 'verduras-hortalizas', name: 'Verduras y hortalizas', iconName: 'Carrot', order: 5 },
  { id: 'legumbres', name: 'Legumbres', iconName: 'Bean', order: 6 },
  { id: 'huevos', name: 'Huevos', iconName: 'Egg', order: 7 },
  { id: 'sopas-cremas', name: 'Sopas y cremas', iconName: 'Soup', order: 8 },
  { id: 'postres-reposteria', name: 'Postres y repostería', iconName: 'CakeSlice', order: 9 },
  { id: 'salsas-acompanamientos', name: 'Salsas y acompañamientos', iconName: 'Salad', order: 10 },
  { id: 'otros', name: 'Otros', iconName: 'Sparkles', order: 11 },
];

// Helper to generate a clean, colorful SVG placeholder data URI
function createFoodSvgDataUri(title: string, bgColor: string, iconEmoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" stop-opacity="1" />
        <stop offset="100%" stop-color="#1e293b" stop-opacity="1" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)" />
    <circle cx="300" cy="170" r="75" fill="rgba(255,255,255,0.15)" />
    <text x="300" y="195" font-size="80" text-anchor="middle" dominant-baseline="middle">${iconEmoji}</text>
    <text x="300" y="300" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="26" fill="#ffffff" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'receta-tortilla-patatas',
    name: 'Tortilla de Patatas Clásica (con cebolla)',
    description: 'La reina de la cocina española: patatas pochadas a fuego lento, cebolla caramelizada suave y huevos de campo en su punto cremoso.',
    categoryId: 'huevos',
    subcategory: 'Platos tradicionales',
    mainPhoto: createFoodSvgDataUri('Tortilla de Patatas', '#d97706', '🍳'),
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    servings: 4,
    difficulty: 'fácil',
    tags: ['tradicional', 'tapa', 'española', 'favorito'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    isFavorite: true,
    origin: {
      type: 'youtube',
      originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      author: 'Cocina con Carmen',
      addedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      status: 'available',
    },
    ingredients: [
      { id: 'ing-1', name: 'Patatas agrias o monalisa', amount: '800', unit: 'g', notes: 'cortadas en láminas de unos 3 mm' },
      { id: 'ing-2', name: 'Huevos grandes camperos', amount: '6', unit: 'uds', notes: 'a temperatura ambiente' },
      { id: 'ing-3', name: 'Cebolla dulce', amount: '1', unit: 'ud grande', notes: 'en juliana fina' },
      { id: 'ing-4', name: 'Aceite de oliva virgen extra', amount: '350', unit: 'ml', notes: 'para pochar suavemente' },
      { id: 'ing-5', name: 'Sal fina', amount: '1', unit: 'cucharadita', notes: 'al gusto' },
    ],
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        instruction: 'Pelar y lavar las patatas. Cortarlas en láminas finas e irregulares. Cortar la cebolla en juliana fina.',
        estimatedMinutes: 10,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        instruction: 'Calentar abundante aceite de oliva en una sartén grande a fuego medio-bajo. Añadir las patatas y la cebolla. Dejar pochar lentamente unos 20-25 minutos removiendo de vez en cuando hasta que la patata esté tierna y no frita crujiente.',
        estimatedMinutes: 25,
      },
      {
        id: 'step-3',
        stepNumber: 3,
        instruction: 'Escurrir bien el aceite de las patatas y la cebolla con ayuda de un colador grande. Dejar reposar 5 minutos.',
        estimatedMinutes: 5,
      },
      {
        id: 'step-4',
        stepNumber: 4,
        instruction: 'En un bol amplio, batir los 6 huevos sin espumar en exceso. Añadir sal. Incorporar la patata y cebolla aún templadas y mezclar bien. Dejar reposar 5-8 minutos para que la patata absorba el huevo.',
        estimatedMinutes: 8,
      },
      {
        id: 'step-5',
        stepNumber: 5,
        instruction: 'Poner unas gotas de aceite en una sartén antiadherente a fuego medio-alto. Verter la mezcla, cuajar 1 minuto removiendo los bordes. Dar la vuelta con un plato llano y cuajar el otro lado durante 1 minuto si se quiere jugosa.',
        estimatedMinutes: 3,
      },
    ],
    personalNotes: 'Si te gusta muy jugosa por dentro (estilo Betanzos), saca del fuego a los 40 segundos por cada lado. Usar siempre huevos de gallinas camperas para un color dorado intenso.',
  },
  {
    id: 'receta-salmorejo-cordobes',
    name: 'Salmorejo Cordobés Tradicional',
    description: 'Crema fría andaluza untuosa a base de tomates maduros, pan de telera, aceite virgen extra y ajo, servida con jamón ibérico y huevo duro.',
    categoryId: 'sopas-cremas',
    subcategory: 'Cremas frías',
    mainPhoto: createFoodSvgDataUri('Salmorejo Cordobés', '#dc2626', '🍅'),
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    servings: 4,
    difficulty: 'fácil',
    tags: ['verano', 'crema', 'sin cocción', 'andaluz'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isFavorite: true,
    origin: {
      type: 'manual',
      author: 'Receta familiar de Córdoba',
      addedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'available',
    },
    ingredients: [
      { id: 'ing-201', name: 'Tomates maduros tipo pera', amount: '1', unit: 'kg', notes: 'bien rojos y lavados' },
      { id: 'ing-202', name: 'Pan con miga densa (tipo telera o candeal)', amount: '200', unit: 'g', notes: 'del día anterior' },
      { id: 'ing-203', name: 'Aceite de oliva virgen extra (Picual o Hojiblanca)', amount: '120', unit: 'ml', notes: 'de gran calidad' },
      { id: 'ing-204', name: 'Diente de ajo', amount: '1/2', unit: 'ud', notes: 'sin el germen central para que no repita' },
      { id: 'ing-205', name: 'Sal', amount: '1', unit: 'pizca', notes: 'al gusto' },
      { id: 'ing-206', name: 'Jamón serrano en taquitos', amount: '60', unit: 'g', notes: 'para acompañar' },
      { id: 'ing-207', name: 'Huevo cocido', amount: '2', unit: 'uds', notes: 'picado fino' },
    ],
    steps: [
      {
        id: 'step-201',
        stepNumber: 1,
        instruction: 'Lavar los tomates, cortar en trozos y triturar en una batidora o robot de cocina hasta obtener un puré homogéneo. Pasar por un colador chino para retirar pieles y pepitas.',
        estimatedMinutes: 5,
      },
      {
        id: 'step-202',
        stepNumber: 2,
        instruction: 'Añadir la miga de pan troceada al puré de tomate y dejar que se empape durante 8 minutos.',
        estimatedMinutes: 8,
      },
      {
        id: 'step-203',
        stepNumber: 3,
        instruction: 'Incorporar el medio diente de ajo y la sal. Triturar a máxima velocidad hasta que la mezcla sea suave.',
        estimatedMinutes: 3,
      },
      {
        id: 'step-204',
        stepNumber: 4,
        instruction: 'Sin dejar de batir a velocidad media, verter el aceite de oliva poco a poco en hilo para emulsionar y lograr la textura cremosa típica.',
        estimatedMinutes: 3,
      },
      {
        id: 'step-205',
        stepNumber: 5,
        instruction: 'Refrigerar en la nevera al menos 2 horas antes de servir. Servir muy frío coronado con huevo duro picado y taquitos de jamón.',
        estimatedMinutes: 2,
      },
    ],
    personalNotes: 'No añadir agua ni vinagre: el auténtico salmorejo cordobés solo lleva tomate, pan, aceite, ajo y sal.',
  },
  {
    id: 'receta-paella-valenciana',
    name: 'Arroz con Pollo, Conejo y Judías',
    description: 'Arroz al estilo tradicional levantino con sofrito de carne bien dorada, garrofó, judías verdes planas y azafrán con socarrat crujiente.',
    categoryId: 'arroces',
    subcategory: 'Arroces secos',
    mainPhoto: createFoodSvgDataUri('Paella Valenciana', '#b45309', '🥘'),
    prepTimeMinutes: 25,
    cookTimeMinutes: 35,
    servings: 4,
    difficulty: 'media',
    tags: ['domingo', 'arroz', 'leña', 'socarrat'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isFavorite: false,
    origin: {
      type: 'youtube',
      originalUrl: 'https://www.youtube.com/watch?v=examplePaella',
      author: 'Chef Vicente',
      addedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'available',
    },
    ingredients: [
      { id: 'ing-301', name: 'Arroz bomba o sénia', amount: '400', unit: 'g' },
      { id: 'ing-302', name: 'Pollo troceado', amount: '500', unit: 'g' },
      { id: 'ing-303', name: 'Conejo troceado', amount: '400', unit: 'g' },
      { id: 'ing-304', name: 'Judía verde plana (bajoqueta)', amount: '200', unit: 'g' },
      { id: 'ing-305', name: 'Garrofó (o judión blanco cocido)', amount: '100', unit: 'g' },
      { id: 'ing-306', name: 'Tomate rallado', amount: '1', unit: 'ud madura' },
      { id: 'ing-307', name: 'Pimentón dulce', amount: '1', unit: 'cucharadita' },
      { id: 'ing-308', name: 'Hebra de azafrán y romero fresco', amount: 'unas hebras y 1 ramita' },
    ],
    steps: [
      {
        id: 'step-301',
        stepNumber: 1,
        instruction: 'En la paella calentar aceite y dorar muy bien los trozos de carne con sal hasta que tomen un color tostado uniforme.',
        estimatedMinutes: 12,
      },
      {
        id: 'step-302',
        stepNumber: 2,
        instruction: 'Añadir las judías verdes y el garrofó. Rehogar unos minutos. Hacer hueco en el centro, incorporar el tomate rallado y luego el pimentón con cuidado de que no se queme.',
        estimatedMinutes: 6,
      },
      {
        id: 'step-303',
        stepNumber: 3,
        instruction: 'Añadir agua hasta los remaches de la paella (aprox. el triple de volumen del arroz). Dejar cocer a fuego vivo 15 minutos para crear el caldo base. Probar de sal (debe estar sabroso).',
        estimatedMinutes: 15,
      },
      {
        id: 'step-304',
        stepNumber: 4,
        instruction: 'Repartir el arroz en diagonal ("caballón") y luego distribuir uniformemente. Cocer 8 minutos a fuego fuerte, luego 10 minutos a fuego suave. Colocar la ramita de romero los últimos 5 minutos.',
        estimatedMinutes: 18,
      },
      {
        id: 'step-305',
        stepNumber: 5,
        instruction: 'Para el socarrat: subir el fuego durante el último minuto hasta escuchar el chisporroteo característico. Dejar reposar 5 minutos tapado con un paño limpio antes de servir.',
        estimatedMinutes: 5,
      },
    ],
    personalNotes: 'No remover el arroz después de distribuirlo para que no suelte almidón y el grano quede suelto.',
  },
  {
    id: 'receta-lentejas-verduras',
    name: 'Lentejas Pardinas con Verduras y Toque de Chorizo',
    description: 'Guiso reconfortante de legumbres con zanahoria, patata, puerro y pimentón de la Vera.',
    categoryId: 'legumbres',
    subcategory: 'Guisos y cuchara',
    mainPhoto: createFoodSvgDataUri('Lentejas Pardinas', '#78350f', '🍲'),
    prepTimeMinutes: 15,
    cookTimeMinutes: 45,
    servings: 4,
    difficulty: 'fácil',
    tags: ['cuchara', 'otoño', 'reconfortante', 'legumbres'],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    isFavorite: false,
    origin: {
      type: 'photo',
      author: 'Libreta de recetas de la abuela',
      addedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      status: 'available',
    },
    ingredients: [
      { id: 'ing-401', name: 'Lentejas pardinas', amount: '350', unit: 'g', notes: 'no necesitan remojo previo' },
      { id: 'ing-402', name: 'Zanahorias', amount: '2', unit: 'uds', notes: 'en rodajas' },
      { id: 'ing-403', name: 'Patata', amount: '1', unit: 'ud', notes: 'chascada en trozos medianos' },
      { id: 'ing-404', name: 'Puerro y cebolla', amount: '1 de cada', unit: 'ud', notes: 'picados finos' },
      { id: 'ing-405', name: 'Chorizo fresco artesanal', amount: '1', unit: 'trozo de 100g' },
      { id: 'ing-406', name: 'Hoja de laurel y pimentón de la Vera', amount: '1 hoja y 1 cdta' },
    ],
    steps: [
      {
        id: 'step-401',
        stepNumber: 1,
        instruction: 'Enjuagar las lentejas con agua fría. En una cazuela amplia poner un hilo de aceite y sofreír la cebolla, el puerro y la zanahoria durante 6 minutos.',
        estimatedMinutes: 8,
      },
      {
        id: 'step-402',
        stepNumber: 2,
        instruction: 'Añadir la cucharadita de pimentón fuera del fuego, remover rápidamente e incorporar las lentejas, la patata chascada, el laurel y el chorizo.',
        estimatedMinutes: 2,
      },
      {
        id: 'step-403',
        stepNumber: 3,
        instruction: 'Cubrir con agua fría unos 3 dedos por encima de los ingredientes. Llevar a ebullición y espumar si es necesario.',
        estimatedMinutes: 5,
      },
      {
        id: 'step-404',
        stepNumber: 4,
        instruction: 'Bajar a fuego suave, tapar y dejar cocer a fuego lento durante 35-40 minutos hasta que la lenteja esté mantecosa.',
        estimatedMinutes: 40,
      },
    ],
    personalNotes: 'Si el caldo queda muy líquido, sacar un trozo de patata y unas cuantas lentejas con un poco de caldo, triturar con tenedor o batidora y volver a incorporar al guiso para espesar de forma natural.',
  },
  {
    id: 'receta-tarta-queso',
    name: 'Tarta de Queso Tostada al Horno (Estilo La Viña)',
    description: 'Cremosa por dentro, tostada por fuera y sin base de galleta. El postre estrella que triunfa en cualquier comida.',
    categoryId: 'postres-reposteria',
    subcategory: 'Tartas',
    mainPhoto: createFoodSvgDataUri('Tarta de Queso', '#ea580c', '🍰'),
    prepTimeMinutes: 10,
    cookTimeMinutes: 45,
    servings: 8,
    difficulty: 'fácil',
    tags: ['postre', 'horno', 'cremoso', 'favorito'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: true,
    origin: {
      type: 'instagram',
      originalUrl: 'https://instagram.com/p/exampleCheesecake',
      author: 'Pastelería Donosti',
      addedAt: new Date().toISOString(),
      status: 'available',
    },
    ingredients: [
      { id: 'ing-501', name: 'Queso crema tipo Philadelphia', amount: '600', unit: 'g' },
      { id: 'ing-502', name: 'Huevos enteros', amount: '4', unit: 'uds L' },
      { id: 'ing-503', name: 'Nata líquida para montar (35% M.G.)', amount: '300', unit: 'ml' },
      { id: 'ing-504', name: 'Azúcar blanco', amount: '180', unit: 'g' },
      { id: 'ing-505', name: 'Harina de trigo o maicena', amount: '1', unit: 'cucharada colmada (15g)' },
    ],
    steps: [
      {
        id: 'step-501',
        stepNumber: 1,
        instruction: 'Precalentar el horno a 210°C con calor arriba y abajo. Forrar un molde desmontable de 20-22 cm con papel vegetal humedecido y arrugado para que se adapte a las paredes.',
        estimatedMinutes: 5,
      },
      {
        id: 'step-502',
        stepNumber: 2,
        instruction: 'En un bol grande, batir el queso crema con el azúcar hasta que no haya grumos. Añadir los huevos uno a uno, integrando con varillas a mano sin meter demasiado aire.',
        estimatedMinutes: 5,
      },
      {
        id: 'step-503',
        stepNumber: 3,
        instruction: 'Verter la nata líquida y la cucharada de harina tamizada. Mezclar hasta obtener una crema lisa y homogénea.',
        estimatedMinutes: 3,
      },
      {
        id: 'step-504',
        stepNumber: 4,
        instruction: 'Verter la masa en el molde. Hornear a 210°C durante 40-45 minutos. Al mover el molde debe temblar ligeramente por el centro (flanero).',
        estimatedMinutes: 45,
      },
      {
        id: 'step-505',
        stepNumber: 5,
        instruction: 'Dejar enfriar a temperatura ambiente durante al menos 4 horas antes de desmoldar y cortar. Mejor aún de un día para otro.',
        estimatedMinutes: 240,
      },
    ],
    personalNotes: 'No enfriar en nevera antes de que esté a temperatura ambiente para no cortar la textura cremoso-fundente.',
  },
];

export async function initializeDatabaseIfEmpty() {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  const recipeCount = await db.recipes.count();
  if (recipeCount === 0) {
    await db.recipes.bulkAdd(INITIAL_RECIPES);
  }
}
