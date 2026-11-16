import JSZip from 'jszip';
import { db } from '../../db/database';
import type { Category, Recipe } from '../../types/recipe';

export interface BackupMetadata {
  version: number;
  appName: string;
  exportedAt: string;
  recipeCount: number;
  categoryCount: number;
}

export interface ImportResult {
  importedRecipes: number;
  skippedRecipes: number;
  importedCategories: number;
  errors: string[];
}

export const backupService = {
  /**
   * Export entire library into a portable ZIP package containing:
   * - metadata.json
   * - recipes.json (with relative image paths)
   * - categories.json
   * - images/ folder containing individual photos
   */
  async exportFullZip(): Promise<Blob> {
    const zip = new JSZip();

    const recipes = await db.recipes.toArray();
    const categories = await db.categories.toArray();

    const metadata: BackupMetadata = {
      version: 1,
      appName: 'Mi Recetario',
      exportedAt: new Date().toISOString(),
      recipeCount: recipes.length,
      categoryCount: categories.length,
    };

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    zip.file('categories.json', JSON.stringify(categories, null, 2));

    const imgFolder = zip.folder('images');
    const processedRecipes: Recipe[] = [];

    for (let i = 0; i < recipes.length; i++) {
      const r = { ...recipes[i] };

      if (r.mainPhoto && r.mainPhoto.startsWith('data:image/')) {
        // Extract mime and base64 payload
        const match = r.mainPhoto.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (match && imgFolder) {
          const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
          const filename = `${r.id}.${extension}`;
          imgFolder.file(filename, match[2], { base64: true });
          r.mainPhoto = `images/${filename}`;
        }
      }

      // Check step photos if any
      if (r.steps) {
        r.steps = r.steps.map((st, sIdx) => {
          if (st.photoUrl && st.photoUrl.startsWith('data:image/') && imgFolder) {
            const sMatch = st.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (sMatch) {
              const ext = sMatch[1] === 'jpeg' ? 'jpg' : sMatch[1];
              const sFilename = `${r.id}_step_${sIdx + 1}.${ext}`;
              imgFolder.file(sFilename, sMatch[2], { base64: true });
              return { ...st, photoUrl: `images/${sFilename}` };
            }
          }
          return st;
        });
      }

      processedRecipes.push(r);
    }

    zip.file('recipes.json', JSON.stringify(processedRecipes, null, 2));

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  },

  /**
   * Import backup from a ZIP archive
   */
  async importFromZip(zipFile: File): Promise<ImportResult> {
    const zip = await JSZip.loadAsync(zipFile);

    const recipesJsonStr = await zip.file('recipes.json')?.async('string');
    if (!recipesJsonStr) {
      throw new Error('El archivo ZIP no contiene un recipes.json válido de Mi Recetario.');
    }

    const importedRecipes: Recipe[] = JSON.parse(recipesJsonStr);
    const existingRecipes = await db.recipes.toArray();

    // Import categories if present
    const categoriesJsonStr = await zip.file('categories.json')?.async('string');
    let importedCategoriesCount = 0;
    if (categoriesJsonStr) {
      const parsedCategories: Category[] = JSON.parse(categoriesJsonStr);
      for (const cat of parsedCategories) {
        const exists = await db.categories.get(cat.id);
        if (!exists) {
          await db.categories.add(cat);
          importedCategoriesCount++;
        }
      }
    }

    // Helper map of existing names and URLs to prevent duplicates
    const existingIds = new Set(existingRecipes.map((r) => r.id));
    const existingNames = new Set(existingRecipes.map((r) => r.name.trim().toLowerCase()));
    const existingUrls = new Set(
      existingRecipes
        .map((r) => r.origin?.originalUrl?.trim().toLowerCase())
        .filter((u): u is string => !!u)
    );

    let addedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const r of importedRecipes) {
      const cleanName = r.name.trim().toLowerCase();
      const cleanUrl = r.origin?.originalUrl?.trim().toLowerCase();

      // Check duplicates
      const isDuplicate =
        existingIds.has(r.id) ||
        existingNames.has(cleanName) ||
        (cleanUrl && existingUrls.has(cleanUrl));

      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      // Reconstruct main photo from images/ folder if stored as relative path
      if (r.mainPhoto && r.mainPhoto.startsWith('images/')) {
        const imgFile = zip.file(r.mainPhoto);
        if (imgFile) {
          const b64 = await imgFile.async('base64');
          const ext = r.mainPhoto.endsWith('.png') ? 'png' : 'jpeg';
          r.mainPhoto = `data:image/${ext};base64,${b64}`;
        }
      }

      // Reconstruct step photos
      if (r.steps) {
        for (const st of r.steps) {
          if (st.photoUrl && st.photoUrl.startsWith('images/')) {
            const sImgFile = zip.file(st.photoUrl);
            if (sImgFile) {
              const sB64 = await sImgFile.async('base64');
              const ext = st.photoUrl.endsWith('.png') ? 'png' : 'jpeg';
              st.photoUrl = `data:image/${ext};base64,${sB64}`;
            }
          }
        }
      }

      try {
        await db.recipes.add(r);
        existingIds.add(r.id);
        existingNames.add(cleanName);
        if (cleanUrl) existingUrls.add(cleanUrl);
        addedCount++;
      } catch (err: any) {
        errors.push(`Error al añadir receta "${r.name}": ${err.message}`);
      }
    }

    return {
      importedRecipes: addedCount,
      skippedRecipes: skippedCount,
      importedCategories: importedCategoriesCount,
      errors,
    };
  },

  /**
   * Export a single recipe as JSON
   */
  exportSingleRecipeJson(recipe: Recipe): Blob {
    const data = JSON.stringify(recipe, null, 2);
    return new Blob([data], { type: 'application/json' });
  },

  /**
   * Helper to trigger download of a Blob file in the browser
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
