import fs from 'fs';

// Duplicate manifest.webmanifest to manifest.json and manifest-v3.webmanifest
// to ensure backwards-compatibility across all Android WebAPK and browser caches.
if (fs.existsSync('dist/manifest.webmanifest')) {
  fs.copyFileSync('dist/manifest.webmanifest', 'dist/manifest.json');
  fs.copyFileSync('dist/manifest.webmanifest', 'dist/manifest-v3.webmanifest');
  console.log('Postbuild: Copied manifest.webmanifest to manifest.json and manifest-v3.webmanifest');
}
