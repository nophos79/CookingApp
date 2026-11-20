import type { DriveConfig, DriveSyncData } from './driveTypes';
import type { Recipe } from '../../types/recipe';
import { db } from '../../db/database';

const CONFIG_STORAGE_KEY = 'mi_recetario_drive_config';
const TOKEN_STORAGE_KEY = 'mi_recetario_drive_token';
const DELETED_IDS_STORAGE_KEY = 'mi_recetario_deleted_ids';
const DRIVE_FILE_NAME = 'mi_recetario_datos.json';
const DRIVE_FOLDER_NAME = 'Mi Recetario';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file email profile';

declare global {
  interface Window {
    google?: any;
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Checks whether a photo string represents an actual user photograph
 * (JPEG, PNG, WebP or external URL) as opposed to a generated placeholder SVG.
 */
export function isRealUserPhoto(photo?: string): boolean {
  if (!photo || typeof photo !== 'string') return false;
  const p = photo.trim();
  if (p.length < 50) return false;
  // Seed SVG placeholders (data:image/svg+xml...) are not real photos
  if (p.startsWith('data:image/svg+xml')) return false;
  return true;
}

export const googleDriveService = {
  getConfig(): DriveConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error al leer configuración de Google Drive:', e);
    }
    return {
      clientId: '',
      storageMode: 'local-only',
    };
  },

  saveConfig(updates: Partial<DriveConfig>): DriveConfig {
    const current = this.getConfig();
    const updated: DriveConfig = { ...current, ...updates };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Returns true if user has configured Google Drive (Client ID and logged in userEmail saved)
   */
  isConnected(): boolean {
    const config = this.getConfig();
    return !!(config.clientId && config.userEmail);
  },

  getDeletedRecipeIds(): string[] {
    try {
      const stored = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  recordDeletedId(id: string): void {
    if (!id) return;
    try {
      const ids = new Set(this.getDeletedRecipeIds());
      ids.add(id);
      const arr = Array.from(ids).slice(-200);
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Error al guardar ID eliminado:', e);
    }
  },

  /**
   * Returns true if an unexpired access token is available right now
   */
  hasValidToken(): boolean {
    return !!this.getAccessToken();
  },

  getAccessToken(): string | null {
    // 1. Check in-memory token
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
      return cachedAccessToken;
    }

    // 2. Rehydrate from localStorage across reloads
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          cachedAccessToken = parsed.token;
          tokenExpiresAt = parsed.expiresAt;
          return cachedAccessToken;
        }
      }
    } catch (e) {
      console.warn('Error al leer token persistido de Google Drive:', e);
    }

    return null;
  },

  saveToken(token: string, expiresInSeconds: number): void {
    cachedAccessToken = token;
    tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
    try {
      localStorage.setItem(
        TOKEN_STORAGE_KEY,
        JSON.stringify({ token, expiresAt: tokenExpiresAt })
      );
    } catch (e) {
      console.warn('No se pudo guardar el token en localStorage:', e);
    }
  },

  /**
   * Load Google Identity Services (GIS) client script dynamically
   */
  async loadGIS(): Promise<void> {
    if (window.google?.accounts?.oauth2) {
      return;
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-gis-script');
      if (existingScript) {
        existingScript.onload = () => resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el script de Google Identity Services'));
      document.body.appendChild(script);
    });
  },

  /**
   * Request OAuth2 access token using Google Identity Services
   */
  async login(): Promise<{ token: string; email: string }> {
    const config = this.getConfig();
    if (!config.clientId || !config.clientId.trim()) {
      throw new Error('Debes configurar un Google Client ID antes de iniciar sesión.');
    }

    await this.loadGIS();

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: config.clientId.trim(),
          scope: DRIVE_SCOPE,
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }

            const expiresIn = Number(response.expires_in) || 3500;
            this.saveToken(response.access_token, expiresIn);

            // Fetch user email
            let email = '';
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                email = userData.email || '';
              }
            } catch (err) {
              console.warn('No se pudo obtener información del perfil:', err);
            }

            this.saveConfig({ userEmail: email });
            resolve({ token: response.access_token, email });
          },
        });

        // Use prompt: '' so if already consented, Google authorizes silently or smoothly
        client.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        reject(err);
      }
    });
  },

  logout(): void {
    const token = this.getAccessToken();
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    this.saveConfig({ userEmail: undefined });
  },

  /**
   * Find or create the dedicated folder in Google Drive
   */
  async getOrCreateFolder(token: string): Promise<string> {
    const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime asc&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Código ${res.status}`;
      throw new Error(`Error al buscar carpeta en Drive: ${msg}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `Código ${createRes.status}`;
      throw new Error(`Error al crear la carpeta en Google Drive: ${msg}`);
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  },

  /**
   * Find database file in Drive, ordering by modifiedTime desc to always get the latest,
   * and purging duplicate stale files if any exist.
   */
  async findDatabaseFile(token: string, folderId: string): Promise<string | null> {
    const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      // If there are duplicate files, delete the older ones to keep exactly one file
      if (data.files.length > 1) {
        for (let i = 1; i < data.files.length; i++) {
          fetch(`https://www.googleapis.com/drive/v3/files/${data.files[i].id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }
      return data.files[0].id;
    }
    return null;
  },

  /**
   * Read recipes and categories from Google Drive
   */
  async downloadFromDrive(token?: string): Promise<DriveSyncData | null> {
    const activeToken = token || this.getAccessToken();
    if (!activeToken) {
      throw new Error('No hay sesión activa con Google Drive.');
    }

    const folderId = await this.getOrCreateFolder(activeToken);
    const fileId = await this.findDatabaseFile(activeToken, folderId);
    if (!fileId) {
      return null;
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Código ${res.status}`;
      throw new Error(`Error al descargar archivo de Google Drive: ${msg}`);
    }

    const data: DriveSyncData = await res.json();
    this.saveConfig({ lastSyncTime: new Date().toISOString() });
    return data;
  },

  /**
   * Save entire recipe database to Google Drive (using clean uploadType=media)
   */
  async uploadToDrive(token?: string): Promise<void> {
    let activeToken = token || this.getAccessToken();
    if (!activeToken) {
      // Try logging in to refresh token if user previously connected
      if (this.isConnected()) {
        const loginRes = await this.login();
        activeToken = loginRes.token;
      } else {
        throw new Error('No hay sesión activa con Google Drive.');
      }
    }

    const recipes = await db.recipes.toArray();
    const categories = await db.categories.toArray();

    const payload: DriveSyncData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      recipes,
      categories,
      deletedRecipeIds: this.getDeletedRecipeIds(),
    };

    const folderId = await this.getOrCreateFolder(activeToken);
    let existingFileId = await this.findDatabaseFile(activeToken, folderId);

    if (!existingFileId) {
      // Step 1: Create file in folder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: DRIVE_FILE_NAME,
          mimeType: 'application/json',
          parents: [folderId],
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'Error al crear archivo en Google Drive');
      }

      const fileData = await createRes.json();
      existingFileId = fileData.id;
    }

    // Step 2: Upload or update content directly using uploadType=media (bulletproof, zero boundary bugs)
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Error al guardar archivo en Google Drive');
    }

    this.saveConfig({ lastSyncTime: new Date().toISOString() });
  },

  /**
   * Synchronize local IndexedDB with Google Drive
   * (Bidirectional smart merge: merges new and updated recipes, photos, and categories)
   */
  async sync(): Promise<{ imported: number; updated: number; uploaded: boolean }> {
    let token = this.getAccessToken();
    if (!token) {
      const loginRes = await this.login();
      token = loginRes.token;
    }

    // 1. Download data from Drive
    const driveData = await this.downloadFromDrive(token);
    let importedCount = 0;
    let updatedCount = 0;

    if (driveData && Array.isArray(driveData.recipes)) {
      // 1. Process deletions from Drive so remote deletes propagate locally
      if (Array.isArray(driveData.deletedRecipeIds) && driveData.deletedRecipeIds.length > 0) {
        for (const deletedId of driveData.deletedRecipeIds) {
          this.recordDeletedId(deletedId);
          await db.recipes.delete(deletedId);
        }
      }

      const deletedIds = new Set(this.getDeletedRecipeIds());
      const existingRecipes = await db.recipes.toArray();
      const localMapById = new Map<string, Recipe>(existingRecipes.map((r) => [r.id, r]));
      const localMapByName = new Map<string, Recipe>(existingRecipes.map((r) => [r.name.trim().toLowerCase(), r]));

      for (const driveRecipe of driveData.recipes) {
        // Skip recipes that have been deleted locally or remotely
        if (deletedIds.has(driveRecipe.id)) {
          continue;
        }

        const localMatch = localMapById.get(driveRecipe.id) || localMapByName.get(driveRecipe.name.trim().toLowerCase());

        if (!localMatch) {
          // New recipe created on another device -> Add to local DB
          await db.recipes.add(driveRecipe);
          localMapById.set(driveRecipe.id, driveRecipe);
          localMapByName.set(driveRecipe.name.trim().toLowerCase(), driveRecipe);
          importedCount++;
        } else {
          // Recipe exists both locally and on Drive
          const driveHasRealPhoto = isRealUserPhoto(driveRecipe.mainPhoto);
          const localHasRealPhoto = isRealUserPhoto(localMatch.mainPhoto);

          const driveTime = driveRecipe.updatedAt ? new Date(driveRecipe.updatedAt).getTime() : 0;
          const localTime = localMatch.updatedAt ? new Date(localMatch.updatedAt).getTime() : 0;

          let chosenPhoto = localMatch.mainPhoto;
          let photoChanged = false;

          if (driveHasRealPhoto && !localHasRealPhoto) {
            // Drive has a real user photo and local only had SVG or empty -> Drive photo wins!
            chosenPhoto = driveRecipe.mainPhoto;
            photoChanged = true;
          } else if (!driveHasRealPhoto && localHasRealPhoto) {
            // Local has real photo and Drive doesn't -> Keep local photo
            chosenPhoto = localMatch.mainPhoto;
          } else if (driveHasRealPhoto && localHasRealPhoto) {
            // Both have real photos: if different, take Drive photo if Drive is equal or newer
            if (driveRecipe.mainPhoto !== localMatch.mainPhoto && driveTime >= localTime) {
              chosenPhoto = driveRecipe.mainPhoto;
              photoChanged = true;
            }
          }

          // Should update local if Drive has newer edits or gave us a better photo
          const shouldUpdateLocal = (driveTime > localTime) || photoChanged;

          if (shouldUpdateLocal) {
            const mergedRecipe: Recipe = {
              ...localMatch,
              ...driveRecipe,
              id: localMatch.id, // Preserve consistent local ID
              mainPhoto: chosenPhoto,
              updatedAt: driveTime > localTime
                ? (driveRecipe.updatedAt || new Date().toISOString())
                : (localMatch.updatedAt || new Date().toISOString()),
            };
            await db.recipes.put(mergedRecipe);
            localMapById.set(localMatch.id, mergedRecipe);
            localMapByName.set(localMatch.name.trim().toLowerCase(), mergedRecipe);
            updatedCount++;
          } else if (localHasRealPhoto && !driveHasRealPhoto) {
            // Ensure local photo is passed to Drive
            driveRecipe.mainPhoto = localMatch.mainPhoto;
          }
        }
      }

      // Sync categories
      if (Array.isArray(driveData.categories)) {
        for (const cat of driveData.categories) {
          const exists = await db.categories.get(cat.id);
          if (!exists) {
            await db.categories.add(cat);
          }
        }
      }
    }

    // 2. Upload combined and up-to-date state back to Drive
    await this.uploadToDrive(token);

    return { imported: importedCount, updated: updatedCount, uploaded: true };
  },
};
