import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/icon-512.svg');
const maskableSvgBuffer = fs.readFileSync('public/icon-maskable.svg');

async function generate() {
  console.log('Generating PNG and ICO icons from SVG sources...');

  // Generate both standard and brand-new pwa-* names to ensure 100% cache invalidation
  const tasks = [
    { buffer: svgBuffer, size: 192, targets: ['public/pwa-icon-192.png', 'public/icon-192.png'] },
    { buffer: svgBuffer, size: 512, targets: ['public/pwa-icon-512.png', 'public/icon-512.png'] },
    { buffer: maskableSvgBuffer, size: 192, targets: ['public/pwa-maskable-192.png', 'public/icon-maskable-192.png'] },
    { buffer: maskableSvgBuffer, size: 512, targets: ['public/pwa-maskable-512.png', 'public/icon-maskable-512.png'] },
    { buffer: svgBuffer, size: 180, targets: ['public/pwa-apple-touch-icon.png', 'public/apple-touch-icon.png'] },
    { buffer: svgBuffer, size: 48, targets: ['public/favicon-48x48.png'] },
    { buffer: svgBuffer, size: 32, targets: ['public/favicon-32x32.png'] },
    { buffer: svgBuffer, size: 16, targets: ['public/favicon-16x16.png'] },
  ];

  for (const task of tasks) {
    const pngData = await sharp(task.buffer).resize(task.size, task.size).png().toFile(task.targets[0]);
    for (let i = 1; i < task.targets.length; i++) {
      fs.copyFileSync(task.targets[0], task.targets[i]);
    }
    console.log(`Created ${task.targets.join(', ')}`);
  }

  // Generate multi-size favicon.ico (16, 32, 48)
  const p16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const images = [
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width, 0);
    entry.writeUInt8(img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...images.map(i => i.buffer)]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Created public/favicon.ico successfully!');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
