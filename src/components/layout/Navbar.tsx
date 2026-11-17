import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutGrid,
  PlusCircle,
  Heart,
  BookOpen,
  Search,
  Wifi,
  WifiOff,
  ChefHat,
  Sparkles,
  Archive,
  Cloud,
} from 'lucide-react';

export type NavTab = 'home' | 'categories' | 'add' | 'favorites' | 'library';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings?: () => void;
  onOpenBackup?: () => void;
  onOpenDrive?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenBackup,
  onOpenDrive,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Name */}
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm shadow-amber-600/30 group-hover:scale-105 transition">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight leading-none">
                Mi Recetario
              </h1>
              <span className="text-[10px] text-neutral-400 font-medium">Personal & Offline</span>
            </div>
          </div>

          {/* Search Bar in Header */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar recetas, ingredientes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-neutral-100 hover:bg-neutral-50 focus:bg-white rounded-full border border-neutral-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition"
            />
          </div>

          {/* Connection Status Badge & Desktop Nav */}
          <div className="flex items-center gap-2">
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 mr-2 text-sm font-semibold">
              <button
                onClick={() => onSelectTab('home')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentTab === 'home' ? 'text-amber-700 bg-amber-50' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Inicio
              </button>
              <button
                onClick={() => onSelectTab('categories')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentTab === 'categories' ? 'text-amber-700 bg-amber-50' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Categorías
              </button>
              <button
                onClick={() => onSelectTab('favorites')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentTab === 'favorites' ? 'text-amber-700 bg-amber-50' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Favoritos
              </button>
              <button
                onClick={() => onSelectTab('library')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentTab === 'library' ? 'text-amber-700 bg-amber-50' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Biblioteca
              </button>
              <button
                onClick={() => onSelectTab('add')}
                className="ml-2 flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nueva Receta</span>
              </button>
            </nav>

            {/* Offline/Online Indicator */}
            <div
              title={isOnline ? 'Conexión activa' : 'Sin conexión: funcionando 100% offline'}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* AI / Assistant Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Configuración de IA y Asistente"
                className="p-1.5 rounded-full text-neutral-500 hover:text-amber-800 hover:bg-neutral-100 transition"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {/* Backup & Restore Modal Trigger */}
            {onOpenBackup && (
              <button
                type="button"
                onClick={onOpenBackup}
                title="Copias de Seguridad (ZIP)"
                className="p-1.5 rounded-full text-neutral-500 hover:text-amber-800 hover:bg-neutral-100 transition"
              >
                <Archive className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {/* Google Drive & Storage Mode Modal Trigger */}
            {onOpenDrive && (
              <button
                type="button"
                onClick={onOpenDrive}
                title="Google Drive y Almacenamiento"
                className="p-1.5 rounded-full text-neutral-500 hover:text-amber-800 hover:bg-neutral-100 transition"
              >
                <Cloud className="w-4 h-4 text-amber-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile (Mobile-First 5 Buttons) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200/90 shadow-lg px-2 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          {/* 1. Inicio */}
          <button
            onClick={() => onSelectTab('home')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition ${
              currentTab === 'home' ? 'text-amber-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Inicio</span>
          </button>

          {/* 2. Categorías */}
          <button
            onClick={() => onSelectTab('categories')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition ${
              currentTab === 'categories' ? 'text-amber-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-bold">Categorías</span>
          </button>

          {/* 3. Añadir Receta (Highlight Center Button) */}
          <button
            onClick={() => onSelectTab('add')}
            className="flex flex-col items-center justify-center -mt-5 transition group"
          >
            <div className="w-13 h-13 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/40 group-active:scale-95 transition">
              <PlusCircle className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 mt-1">Añadir</span>
          </button>

          {/* 4. Favoritos */}
          <button
            onClick={() => onSelectTab('favorites')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition ${
              currentTab === 'favorites' ? 'text-amber-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Favoritos</span>
          </button>

          {/* 5. Biblioteca */}
          <button
            onClick={() => onSelectTab('library')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition ${
              currentTab === 'library' ? 'text-amber-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold">Biblioteca</span>
          </button>
        </div>
      </nav>
    </>
  );
};
