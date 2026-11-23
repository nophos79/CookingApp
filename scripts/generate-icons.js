import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/icon-512.svg');
const maskableSvgBuffer = fs.readFileSync('public/icon-maskable.svg');

async function generate() {
  console.log('Generating PNG icons from SVG sources...');

  // Standard icons for PWA, iOS and Favicon
  const tasks = [
    { buffer: svgBuffer, size: 192, target: 'public/icon-192.png' },
    { buffer: svgBuffer, size: 512, target: 'public/icon-512.png' },
    { buffer: maskableSvgBuffer, size: 192, target: 'public/icon-maskable-192.png' },
    { buffer: maskableSvgBuffer, size: 512, target: 'public/icon-maskable-512.png' },
    { buffer: svgBuffer, size: 180, target: 'public/apple-touch-icon.png' },
    { buffer: svgBuffer, size: 32, target: 'public/favicon-32x32.png' },
    { buffer: svgBuffer, size: 16, target: 'public/favicon-16x16.png' },
  ];

  for (const task of tasks) {
    await sharp(task.buffer).resize(task.size, task.size).png().toFile(task.target);
    console.log(`Created ${task.target}`);
  }

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
