import sharp from 'sharp';
import fs from 'fs';

// Master SVG Content (100% identical to AppLogo.tsx in Navbar)
const SVG_DEFS = `
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>
`;

const SVG_PATHS = `
  <!-- House Roof & Chimney -->
  <path
    d="M12 38L50 12L88 38"
    fill="none"
    stroke="#FFFFFF"
    stroke-width="6.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path
    d="M72 24V16H80V30"
    fill="none"
    stroke="#FFFFFF"
    stroke-width="4.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.9"
  />

  <!-- Steam Waves -->
  <path
    d="M43 27C43 23 46 20 46 16"
    fill="none"
    stroke="#FFFFFF"
    stroke-width="3.5"
    stroke-linecap="round"
    opacity="0.85"
  />
  <path
    d="M55 28C55 24 58 21 58 17"
    fill="none"
    stroke="#FFFFFF"
    stroke-width="3.5"
    stroke-linecap="round"
    opacity="0.85"
  />

  <!-- Pot Lid & Knob -->
  <path
    d="M24 52C24 45 30 42 50 42C70 42 76 45 76 52H24Z"
    fill="#FFFFFF"
  />
  <circle cx="50" cy="37.5" r="4.5" fill="#FFFFFF" />

  <!-- Pot Body -->
  <path
    d="M20 56C20 56 23 86 50 86C77 86 80 56 80 56H20Z"
    fill="#FFFFFF"
  />

  <!-- Side Handles -->
  <path
    d="M14 60C14 57 16 56 20 56V63C16 63 14 62 14 60Z"
    fill="#FFFFFF"
    opacity="0.95"
  />
  <path
    d="M86 60C86 57 84 56 80 56V63C84 63 86 62 86 60Z"
    fill="#FFFFFF"
    opacity="0.95"
  />
`;

// 1. Edge-to-edge square SVG with safe-zone emblem (Android PWA launcher & WebAPK maskable)
const fullSquareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512" fill="none">
  ${SVG_DEFS}
  <rect width="100" height="100" fill="url(#brandGrad)" />
  <g transform="translate(50, 50) scale(0.78) translate(-50, -50)">
    ${SVG_PATHS}
  </g>
</svg>`;

// 2. Squircle SVG with rounded corners (Browser favicon & Apple Touch Icon)
const squircleFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  ${SVG_DEFS}
  <rect width="100" height="100" rx="20" fill="url(#brandGrad)" />
  <g transform="translate(50, 50) scale(0.82) translate(-50, -50)">
    ${SVG_PATHS}
  </g>
</svg>`;

async function generate() {
  console.log('Generating unified PNG, ICO, and SVG icons from master SVG...');

  // Save the master SVG files
  fs.writeFileSync('public/favicon.svg', squircleFaviconSvg);
  fs.writeFileSync('public/icon-512.svg', fullSquareSvg);
  fs.writeFileSync('public/icon-192.svg', fullSquareSvg);
  fs.writeFileSync('public/icon-maskable.svg', fullSquareSvg);

  const fullSquareBuffer = Buffer.from(fullSquareSvg);
  const faviconBuffer = Buffer.from(squircleFaviconSvg);

  // Render PNGs for all standard, pwa-*, and versioned v3 paths
  const tasks = [
    {
      buffer: fullSquareBuffer,
      size: 512,
      targets: [
        'public/pwa-icon-512.png',
        'public/pwa-icon-v3-512.png',
        'public/icon-512.png',
        'public/pwa-maskable-512.png',
        'public/pwa-maskable-v3-512.png',
        'public/icon-maskable-512.png'
      ]
    },
    {
      buffer: fullSquareBuffer,
      size: 192,
      targets: [
        'public/pwa-icon-192.png',
        'public/pwa-icon-v3-192.png',
        'public/icon-192.png',
        'public/pwa-maskable-192.png',
        'public/pwa-maskable-v3-192.png',
        'public/icon-maskable-192.png'
      ]
    },
    {
      buffer: squircleFaviconBufferOrSquare(fullSquareBuffer),
      size: 180,
      targets: [
        'public/pwa-apple-touch-icon.png',
        'public/apple-touch-icon.png',
        'public/apple-touch-icon-v3.png'
      ]
    },
    { buffer: faviconBuffer, size: 48, targets: ['public/favicon-48x48.png'] },
    { buffer: faviconBuffer, size: 32, targets: ['public/favicon-32x32.png'] },
    { buffer: faviconBuffer, size: 16, targets: ['public/favicon-16x16.png'] },
  ];

  function squircleFaviconBufferOrSquare(buf) {
    return buf;
  }

  for (const task of tasks) {
    const png = await sharp(task.buffer).resize(task.size, task.size).png().toBuffer();
    for (const t of task.targets) {
      fs.writeFileSync(t, png);
      console.log(`Created ${t}`);
    }
  }

  // Generate multi-resolution favicon.ico containing 16x16, 32x32, 48x48
  const p16 = await sharp(faviconBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(faviconBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(faviconBuffer).resize(48, 48).png().toBuffer();

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
  fs.writeFileSync('public/favicon-v3.ico', icoBuffer);
  console.log('Created public/favicon.ico and favicon-v3.ico successfully!');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
