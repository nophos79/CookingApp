import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('public/icon-512.svg');
const maskableSvgBuffer = fs.readFileSync('public/icon-maskable.svg');

async function generate() {
  console.log('Generating PNG icons from SVG sources...');

  // 192x192 standard icon (purpose: any)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('Created public/icon-192.png');

  // 512x512 standard icon (purpose: any)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('Created public/icon-512.png');

  // 192x192 maskable icon for Android Adaptive Icons (purpose: maskable)
  await sharp(maskableSvgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-maskable-192.png');
  console.log('Created public/icon-maskable-192.png');

  // 512x512 maskable icon for Android Adaptive Icons (purpose: maskable)
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-maskable-512.png');
  console.log('Created public/icon-maskable-512.png');

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
