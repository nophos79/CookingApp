# Mi Recetario 🍳📱

> Aplicación web progresiva (PWA), privada, personal y **100% offline-first**, diseñada con prioridad mobile-first para Android. Permite gestionar colecciones de recetas procedentes de YouTube, Instagram, WhatsApp y fotografías familiares de recetarios.

---

## 🌟 Principales características

- **📱 Experiencia Mobile-First**: Diseñada para teléfonos móviles con barra de navegación táctil inferior, tarjetas en cuadrícula de 2 columnas y áreas seguras.
- **⚡ 100% Offline con IndexedDB & Service Worker**: Tus recetas y fotografías se almacenan localmente en el dispositivo. Si un vídeo de YouTube desaparece o se privatiza, tu receta, ingredientes y pasos siguen intactos.
- **👨‍🍳 Modo Cocina**: Vista a pantalla completa sin distracciones con tipografía grande, avance paso a paso, cajón deslizable de ingredientes y prevención de apagado de pantalla mediante la **Screen Wake Lock API**.
- **🔗 Importación inteligente por URL**: Extracción de metadatos oEmbed de YouTube (autor, miniatura de alta resolución y título) y estructuración automática de transcripciones.
- **📷 Reconocimiento de texto (OCR)**: Integración con Tesseract.js para escanear y transcribir fotos de libros y notas manuscritas directamente en el navegador.
- **🧠 IA y Reglas Desacopladas**:
  - *Extractor local por reglas (100% gratuito y privado)*: No requiere suscripciones, internet ni claves API.
  - *Google Gemini 1.5 Flash (Opcional)*: Soporte para clave API personal gratuita de Google AI Studio almacenada en local.
- **📦 Copias de seguridad completas en ZIP**: Exportación e importación de toda la colección (JSON + carpetas con imágenes) con detección automática y omisión de duplicados.
- **📄 Exportación a PDF e Impresión**: Ficha imprimible con formato limpio de 1 o 2 páginas.
- **🔄 Web Share Target API**: Comparte enlaces directamente desde YouTube, Instagram o WhatsApp al recetario en Android.

---

## 🚀 Despliegue en GitHub Pages

Este repositorio incluye un flujo de trabajo automatizado de GitHub Actions en `.github/workflows/deploy.yml`.

### Pasos para activar GitHub Pages:
1. Sube este repositorio a tu cuenta de GitHub:
   ```bash
   git remote add origin https://github.com/<TU_USUARIO>/<NOMBRE_REPOSITORIO>.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub, entra en tu repositorio y ve a **Settings** &rarr; **Pages**.
3. En **Build and deployment** &rarr; **Source**, selecciona **GitHub Actions**.
4. ¡Listo! Cada vez que hagas un push a `main`, la aplicación se compilará y se publicará automáticamente en:
   `https://<TU_USUARIO>.github.io/<NOMBRE_REPOSITORIO>/`

---

## 🛠️ Tecnologías utilizadas

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Lucide Icons**
- **Dexie.js** (IndexedDB reactivo)
- **vite-plugin-pwa** (Workbox, Service Workers, Web Manifest)
- **Tesseract.js** (OCR en español en Web Worker)
- **JSZip** (Empaquetado y descompresión de copias ZIP)
