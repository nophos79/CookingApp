import type { DriveConfig, DriveSyncData } from './driveTypes';
import { db } from '../../db/database';

const CONFIG_STORAGE_KEY = 'mi_recetario_drive_config';
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

  isConnected(): boolean {
    return !!cachedAccessToken && Date.now() < tokenExpiresAt;
  },

  getAccessToken(): string | null {
    if (this.isConnected()) {
      return cachedAccessToken;
    }
    return null;
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

            cachedAccessToken = response.access_token;
            // Token is typically valid for 3500 seconds (~1 hour)
            const expiresIn = Number(response.expires_in) || 3500;
            tokenExpiresAt = Date.now() + expiresIn * 1000;

            // Fetch user email
            let email = '';
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${cachedAccessToken}` },
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

        client.requestAccessToken();
      } catch (err: any) {
        reject(err);
      }
    });
  },

  logout(): void {
    if (cachedAccessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(cachedAccessToken, () => {});
    }
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    this.saveConfig({ userEmail: undefined });
  },

  /**
   * Find or create the dedicated folder in Google Drive
   */
  async getOrCreateFolder(token: string): Promise<string> {
    const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Error al buscar carpeta en Drive: ${res.statusText}`);
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
      throw new Error('Error al crear la carpeta en Google Drive');
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  },

  /**
   * Find database file in Drive
   */
  async findDatabaseFile(token: string, folderId: string): Promise<string | null> {
    const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
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
      throw new Error(`Error al descargar archivo de Google Drive: ${res.statusText}`);
    }

    const data: DriveSyncData = await res.json();
    this.saveConfig({ lastSyncTime: new Date().toISOString() });
    return data;
  },

  /**
   * Save entire recipe database to Google Drive
   */
  async uploadToDrive(token?: string): Promise<void> {
    const activeToken = token || this.getAccessToken();
    if (!activeToken) {
      throw new Error('No hay sesión activa con Google Drive.');
    }

    const recipes = await db.recipes.toArray();
    const categories = await db.categories.toArray();

    const payload: DriveSyncData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      recipes,
      categories,
    };

    const folderId = await this.getOrCreateFolder(activeToken);
    const existingFileId = await this.findDatabaseFile(activeToken, folderId);

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      parents: existingFileId ? undefined : [folderId],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(payload) +
      closeDelimiter;

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const method = existingFileId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Error al guardar archivo en Google Drive');
    }

    this.saveConfig({ lastSyncTime: new Date().toISOString() });
  },

  /**
   * Synchronize local IndexedDB with Google Drive
   * (Merges both, avoiding duplicates, and writes updated set to both)
   */
  async sync(): Promise<{ imported: number; uploaded: boolean }> {
    let token = this.getAccessToken();
    if (!token) {
      const loginRes = await this.login();
      token = loginRes.token;
    }

    // 1. Download data from Drive
    const driveData = await this.downloadFromDrive(token);
    let importedCount = 0;

    if (driveData && Array.isArray(driveData.recipes)) {
      const existingRecipes = await db.recipes.toArray();
      const existingIds = new Set(existingRecipes.map((r) => r.id));
      const existingNames = new Set(existingRecipes.map((r) => r.name.trim().toLowerCase()));

      for (const r of driveData.recipes) {
        if (!existingIds.has(r.id) && !existingNames.has(r.name.trim().toLowerCase())) {
          await db.recipes.add(r);
          existingIds.add(r.id);
          existingNames.add(r.name.trim().toLowerCase());
          importedCount++;
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

    // 2. Upload combined state back to Drive
    await this.uploadToDrive(token);

    return { imported: importedCount, uploaded: true };
  },
};
