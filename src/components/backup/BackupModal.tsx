import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { backupService, type ImportResult } from '../../services/backup/backupService';

interface BackupModalProps {
  isOpen: boolean;
  totalRecipes: number;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  totalRecipes,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExportZip = async () => {
    setIsExporting(true);
    setErrorMessage('');
    try {
      const zipBlob = await backupService.exportFullZip();
      const dateStr = new Date().toISOString().split('T')[0];
      backupService.triggerDownload(zipBlob, `MiRecetario_Copia_${dateStr}.zip`);
    } catch (err: any) {
      setErrorMessage('Error al exportar copia de seguridad: ' + (err.message || 'error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMessage('');
    setImportResult(null);

    try {
      const result = await backupService.importFromZip(file);
      setImportResult(result);
    } catch (err: any) {
      setErrorMessage('Error al importar la copia de seguridad: ' + (err.message || 'error'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Copias de Seguridad</h3>
              <p className="text-[11px] text-neutral-500">Exportación e importación completa (ZIP)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {importResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Restauración completada con éxito</span>
            </div>
            <p>
              &bull; <strong>{importResult.importedRecipes}</strong> recetas nuevas añadidas.
            </p>
            {importResult.skippedRecipes > 0 && (
              <p className="text-emerald-700">
                &bull; <strong>{importResult.skippedRecipes}</strong> recetas omitidas por estar ya en tu biblioteca (sin duplicados).
              </p>
            )}
            {importResult.importedCategories > 0 && (
              <p>
                &bull; <strong>{importResult.importedCategories}</strong> categorías nuevas creadas.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3.5">
          {/* Export Action Card */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Exportar biblioteca completa</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Genera un paquete ZIP con todas tus {totalRecipes} recetas, categorías y fotografías guardadas.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Empaquetando ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Copia de Seguridad (.ZIP)</span>
                </>
              )}
            </button>
          </div>

          {/* Import Action Card */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-3">
            <div>
              <h4 className="font-bold text-sm text-neutral-900">Restaurar desde archivo ZIP</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Recupera tu colección en un teléfono nuevo o tras reinstalar. Evita duplicados automáticamente.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Restaurando colección y fotos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Seleccionar archivo ZIP de copia</span>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Security & Portability Note */}
        <div className="pt-1 flex items-start gap-2 text-[11px] text-neutral-500">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            El formato de copia es 100% independiente de la aplicación (incluye archivos JSON estándar y fotografías en carpetas).
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
