import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync('public/icon-512.svg');

async function generate() {
  console.log('Generating PNG icons from icon-512.svg...');

  // 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('Created public/icon-192.png');

  // 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('Created public/icon-512.png');

  // 180x180 Apple Touch Icon (iOS home screen)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png');

  // Favicon PNG 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32x32.png');
  console.log('Created public/favicon-32x32.png');

  // Favicon PNG 16x16
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile('public/favicon-16x16.png');
  console.log('Created public/favicon-16x16.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
