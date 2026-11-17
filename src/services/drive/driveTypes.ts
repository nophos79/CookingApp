export type StorageMode = 'drive-only' | 'hybrid' | 'local-only';

export interface DriveConfig {
  clientId: string;
  storageMode: StorageMode;
  userEmail?: string;
  lastSyncTime?: string;
}

export interface DriveSyncData {
  version: number;
  updatedAt: string;
  recipes: any[];
  categories: any[];
}
