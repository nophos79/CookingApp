import { createWorker } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number; // 0 to 1
}

export async function recognizeTextFromImage(
  imageSource: string | File | Blob,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> {
  let worker: any = null;
  try {
    onProgress?.({ status: 'Inicializando motor OCR en el navegador...', progress: 0.1 });

    // Create worker with Spanish ('spa') language and English fallback
    worker = await createWorker('spa', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: 'Reconociendo texto en la fotografía...',
            progress: 0.3 + (m.progress || 0) * 0.65,
          });
        } else if (m.status) {
          onProgress?.({
            status: m.status,
            progress: 0.2,
          });
        }
      },
    });

    onProgress?.({ status: 'Analizando contenido...', progress: 0.3 });

    const ret = await worker.recognize(imageSource);
    onProgress?.({ status: 'Procesamiento completado', progress: 1.0 });

    return ret.data.text || '';
  } catch (err: any) {
    console.error('Error durante el OCR:', err);
    throw new Error('No se pudo extraer texto de la imagen: ' + (err.message || 'error desconocido'));
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}
