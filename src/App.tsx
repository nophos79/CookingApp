import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { initializeDatabaseIfEmpty } from './db/seedData';
import { recipeService } from './services/recipeService';
import type { Category, Recipe, RecipeFilter } from './types/recipe';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { HomeView } from './components/home/HomeView';
import { CategoriesView } from './components/categories/CategoriesView';
import { LibraryView } from './components/library/LibraryView';
import { RecipeDetail } from './components/recipes/RecipeDetail';
import { RecipeForm } from './components/recipes/RecipeForm';
import { CookMode } from './components/recipes/CookMode';
import { ImportHub } from './components/import/ImportHub';
import { AISettingsModal } from './components/settings/AISettingsModal';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { BackupModal } from './components/backup/BackupModal';
import { StorageSettingsModal } from './components/settings/StorageSettingsModal';
import { googleDriveService } from './services/drive/googleDriveService';

export const App: React.FC = () => {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);

  // Import & Review Flow State
  const [importedRecipeReview, setImportedRecipeReview] = useState<
    Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> | null
  >(null);
  const [isManualCreation, setIsManualCreation] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [sharedImportData, setSharedImportData] = useState<{ url?: string; text?: string } | null>(null);

  // Web Share Target parameters listener (e.g. from YouTube or WhatsApp share sheet on Android)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      const textParam = params.get('text');
      const titleParam = params.get('title');

      if (urlParam || textParam || titleParam) {
        setSharedImportData({
          url: urlParam || undefined,
          text: textParam || titleParam || undefined,
        });
        setCurrentTab('add');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.warn('Error al leer share target:', e);
    }
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<RecipeFilter>({});

  // DB initialization
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabaseIfEmpty()
      .then(() => {
        setIsDbReady(true);
        // If Google Drive is active, background sync on startup to pull changes from other devices
        const cfg = googleDriveService.getConfig();
        if (cfg.storageMode !== 'local-only' && googleDriveService.isConnected()) {
          googleDriveService.sync().catch((err) => console.warn('Sync de arranque falló:', err));
        }
      })
      .catch((err) => {
        console.error('Error al inicializar la base de datos:', err);
        setIsDbReady(true);
      });
  }, []);

  // Auto-sync on visibility change (e.g. switching back to tab or unlocking mobile phone)
  useEffect(() => {
    let lastVisibilitySync = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Throttle to at most once every 30 seconds
        if (now - lastVisibilitySync > 30000) {
          lastVisibilitySync = now;
          const cfg = googleDriveService.getConfig();
          if (cfg.storageMode !== 'local-only' && googleDriveService.isConnected()) {
            googleDriveService.sync().catch((err) => console.warn('Sync al volver a la app falló:', err));
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Reactive queries from IndexedDB using Dexie
  const recipes = useLiveQuery(() => db.recipes.toArray(), [], []) as Recipe[];
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [], []) as Category[];

  // Filtered recipes for Search or Library
  const getFilteredRecipes = () => {
    let list = recipes;

    // Apply global search query if entered
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const nameMatch = r.name?.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const authorMatch = r.origin?.author?.toLowerCase().includes(q);
        const tagMatch = r.tags?.some((t) => t.toLowerCase().includes(q));
        const ingMatch = r.ingredients?.some((ing) => ing.name?.toLowerCase().includes(q));
        return nameMatch || descMatch || authorMatch || tagMatch || ingMatch;
      });
    }

    // Tab-specific filters
    if (currentTab === 'favorites') {
      list = list.filter((r) => r.isFavorite);
    } else if (currentTab === 'library') {
      if (libraryFilter.categoryId) {
        list = list.filter((r) => r.categoryId === libraryFilter.categoryId);
      }
      if (libraryFilter.onlyFavorites) {
        list = list.filter((r) => r.isFavorite);
      }
      if (libraryFilter.originType) {
        list = list.filter((r) => r.origin?.type === libraryFilter.originType);
      }
      if (libraryFilter.onlyDrafts) {
        list = list.filter((r) => r.isDraft);
      }
      if (libraryFilter.maxTimeMinutes) {
        list = list.filter((r) => {
          const total = (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
          return total <= (libraryFilter.maxTimeMinutes || 9999);
        });
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const filteredRecipes = getFilteredRecipes();

  // Handlers
  const handleToggleFavorite = async (e: React.MouseEvent | undefined, id: string) => {
    if (e) e.stopPropagation();
    try {
      const isFav = await recipeService.toggleFavorite(id);
      if (selectedRecipe && selectedRecipe.id === id) {
        setSelectedRecipe((prev) => (prev ? { ...prev, isFavorite: isFav } : null));
      }
    } catch (err) {
      console.error('Error al cambiar favorito:', err);
    }
  };

  const handleSaveRecipe = async (
    recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingRecipe) {
      await recipeService.update(editingRecipe.id, recipeData);
      const updated = await recipeService.getById(editingRecipe.id);
      setSelectedRecipe(updated || null);
    } else {
      const created = await recipeService.create(recipeData);
      setSelectedRecipe(created);
    }
    setEditingRecipe(null);
    setImportedRecipeReview(null);
    setIsManualCreation(false);
    if (currentTab === 'add') setCurrentTab('home');
  };

  const handleDeleteRecipe = async (id: string) => {
    await recipeService.delete(id);
    setSelectedRecipe(null);
  };

  const handleAddCategory = async (name: string) => {
    await recipeService.addCategory(name);
  };

  const handleSelectCategoryFromHome = (catId: string) => {
    if (catId === 'all') {
      setCurrentTab('categories');
    } else {
      setLibraryFilter({ categoryId: catId });
      setCurrentTab('library');
    }
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-neutral-700">Cargando Mi Recetario...</p>
        </div>
      </div>
    );
  }

  // 1. Cook Mode (Full screen distraction-free)
  if (cookingRecipe) {
    return (
      <CookMode
        recipe={cookingRecipe}
        onExit={() => setCookingRecipe(null)}
      />
    );
  }

  // 2. Review Imported Recipe from URL or Photo
  if (importedRecipeReview) {
    return (
      <RecipeForm
        initialRecipe={importedRecipeReview}
        categories={categories}
        isReviewingImport={true}
        onSave={handleSaveRecipe}
        onCancel={() => setImportedRecipeReview(null)}
      />
    );
  }

  // 3. Edit Existing Recipe or Direct Manual Form
  if (editingRecipe || isManualCreation) {
    return (
      <RecipeForm
        initialRecipe={editingRecipe}
        categories={categories}
        onSave={handleSaveRecipe}
        onCancel={() => {
          setEditingRecipe(null);
          setIsManualCreation(false);
        }}
      />
    );
  }

  // 4. Import Hub when tapping "+ Añadir" tab
  if (currentTab === 'add') {
    return (
      <ImportHub
        categories={categories}
        initialUrl={sharedImportData?.url}
        initialText={sharedImportData?.text}
        onStartManual={() => {
          setSharedImportData(null);
          setIsManualCreation(true);
        }}
        onReviewImportedRecipe={(data) => {
          setSharedImportData(null);
          setImportedRecipeReview(data);
        }}
        onCancel={() => {
          setSharedImportData(null);
          setCurrentTab('home');
        }}
      />
    );
  }

  // 5. Recipe Detail View
  if (selectedRecipe) {
    const activeRecipe =
      recipes.find(
        (r) =>
          r.id === selectedRecipe.id ||
          (r.name && selectedRecipe.name && r.name.trim().toLowerCase() === selectedRecipe.name.trim().toLowerCase())
      ) || selectedRecipe;
    return (
      <RecipeDetail
        recipe={activeRecipe}
        categories={categories}
        onBack={() => setSelectedRecipe(null)}
        onEdit={(r) => setEditingRecipe(r)}
        onDelete={handleDeleteRecipe}
        onToggleFavorite={(id) => handleToggleFavorite(undefined, id)}
        onStartCookMode={(r) => setCookingRecipe(r)}
      />
    );
  }

  // 6. Main Views (with Navbar and Bottom Navigation)
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedRecipe(null);
          setEditingRecipe(null);
          setImportedRecipeReview(null);
          setIsManualCreation(false);
          setCurrentTab(tab);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenDrive={() => setIsDriveModalOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 sm:pt-6">
        {searchQuery.trim() ? (
          <LibraryView
            recipes={filteredRecipes}
            categories={categories}
            filter={libraryFilter}
            onFilterChange={setLibraryFilter}
            onSelectRecipe={(r) => setSelectedRecipe(r)}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomeView
                recipes={recipes}
                categories={categories}
                onSelectCategory={handleSelectCategoryFromHome}
                onSelectRecipe={(r) => setSelectedRecipe(r)}
                onToggleFavorite={handleToggleFavorite}
                onAddNewRecipe={() => setCurrentTab('add')}
                onViewAllFavorites={() => setCurrentTab('favorites')}
                onViewAllRecipes={() => setCurrentTab('library')}
              />
            )}

            {currentTab === 'categories' && (
              <CategoriesView
                categories={categories}
                recipes={recipes}
                onSelectCategory={(catId) => {
                  setLibraryFilter({ categoryId: catId });
                  setCurrentTab('library');
                }}
                onAddCategory={handleAddCategory}
              />
            )}

            {currentTab === 'favorites' && (
              <LibraryView
                recipes={filteredRecipes}
                categories={categories}
                filter={{ onlyFavorites: true }}
                onFilterChange={setLibraryFilter}
                onSelectRecipe={(r) => setSelectedRecipe(r)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentTab === 'library' && (
              <LibraryView
                recipes={filteredRecipes}
                categories={categories}
                filter={libraryFilter}
                onFilterChange={setLibraryFilter}
                onSelectRecipe={(r) => setSelectedRecipe(r)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </>
        )}
      </main>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        totalRecipes={recipes.length}
        onClose={() => setIsBackupOpen(false)}
      />

      {/* Google Drive & Storage Settings Modal */}
      <StorageSettingsModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />

      {/* Android PWA Install Banner */}
      <PwaInstallPrompt />
    </div>
  );
};

export default App;
