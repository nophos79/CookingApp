import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/icon-512.svg');
const maskableSvgBuffer = fs.readFileSync('public/icon-maskable.svg');

async function generate() {
  console.log('Generating PNG icons from SVG sources...');

  // Generate both standard and brand-new pwa-* names to ensure 100% cache invalidation
  const tasks = [
    { buffer: svgBuffer, size: 192, targets: ['public/pwa-icon-192.png', 'public/icon-192.png'] },
    { buffer: svgBuffer, size: 512, targets: ['public/pwa-icon-512.png', 'public/icon-512.png'] },
    { buffer: maskableSvgBuffer, size: 192, targets: ['public/pwa-maskable-192.png', 'public/icon-maskable-192.png'] },
    { buffer: maskableSvgBuffer, size: 512, targets: ['public/pwa-maskable-512.png', 'public/icon-maskable-512.png'] },
    { buffer: svgBuffer, size: 180, targets: ['public/pwa-apple-touch-icon.png', 'public/apple-touch-icon.png'] },
    { buffer: svgBuffer, size: 32, targets: ['public/favicon-32x32.png'] },
    { buffer: svgBuffer, size: 16, targets: ['public/favicon-16x16.png'] },
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
