import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/icon-512.svg');
const maskableSvgBuffer = fs.readFileSync('public/icon-maskable.svg');

async function generate() {
  console.log('Generating PNG icons from SVG sources...');

  // Standard icons (both unversioned and versioned v3 for cache-busting)
  const tasks = [
    // 192x192 standard icon (purpose: any)
    { buffer: svgBuffer, size: 192, targets: ['public/icon-192.png', 'public/icon-192-v3.png'] },
    // 512x512 standard icon (purpose: any)
    { buffer: svgBuffer, size: 512, targets: ['public/icon-512.png', 'public/icon-512-v3.png'] },
    // 192x192 maskable icon for Android Adaptive Icons (purpose: maskable)
    { buffer: maskableSvgBuffer, size: 192, targets: ['public/icon-maskable-192.png', 'public/icon-maskable-192-v3.png'] },
    // 512x512 maskable icon for Android Adaptive Icons (purpose: maskable)
    { buffer: maskableSvgBuffer, size: 512, targets: ['public/icon-maskable-512.png', 'public/icon-maskable-512-v3.png'] },
    // 180x180 Apple Touch Icon (iOS home screen)
    { buffer: svgBuffer, size: 180, targets: ['public/apple-touch-icon.png', 'public/apple-touch-icon-v3.png'] },
    // Favicon PNG 32x32
    { buffer: svgBuffer, size: 32, targets: ['public/favicon-32x32.png', 'public/favicon-32x32-v3.png'] },
    // Favicon PNG 16x16
    { buffer: svgBuffer, size: 16, targets: ['public/favicon-16x16.png', 'public/favicon-16x16-v3.png'] },
  ];

  for (const task of tasks) {
    const pngData = await sharp(task.buffer).resize(task.size, task.size).png().toBuffer();
    for (const target of task.targets) {
      fs.writeFileSync(target, pngData);
      console.log(`Created ${target}`);
    }
  }

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
