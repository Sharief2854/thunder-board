import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard CRC32 implementation for PNG chunks
function makeCRCTable() {
  const cTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    cTable[n] = c;
  }
  return cTable;
}

const crcTable = makeCRCTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const len = dataBuf.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(typeStr, 4, 4, 'ascii');
  dataBuf.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

function createPNG(width, height, renderPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // No filter for scanline
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);

  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createICO(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width === 256 ? 0 : width, 0);
  dirEntry.writeUInt8(height === 256 ? 0 : height, 1);
  dirEntry.writeUInt8(0, 2); // color palette count
  dirEntry.writeUInt8(0, 3); // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bpp
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // size of image data
  dirEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

// Render ChalkByte Icon
function renderChalkByteIcon(x, y, w, h) {
  // Normalize coordinates -1 to 1
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;

  // Squircle rounded corner distance: (|nx|^4 + |ny|^4)^(1/4)
  const squircle = Math.pow(Math.pow(Math.abs(nx), 4.2) + Math.pow(Math.abs(ny), 4.2), 1 / 4.2);

  // Outside icon frame
  if (squircle > 0.88) {
    return [0, 0, 0, 0];
  }

  // Border glow
  const isBorder = squircle > 0.82 && squircle <= 0.88;

  // Background gradient (Deep Slate #0c101d to Dark Indigo/Violet #17153a)
  const gradT = (nx + ny + 2) / 4;
  let r = Math.round(12 * (1 - gradT) + 25 * gradT);
  let g = Math.round(16 * (1 - gradT) + 21 * gradT);
  let b = Math.round(29 * (1 - gradT) + 58 * gradT);
  let a = 255;

  if (isBorder) {
    // Neon Cyan / Indigo border gradient
    const borderT = (nx + 1) / 2;
    r = Math.round(56 * (1 - borderT) + 168 * borderT);
    g = Math.round(189 * (1 - borderT) + 85 * borderT);
    b = Math.round(248 * (1 - borderT) + 247 * borderT);
    return [r, g, b, 255];
  }

  // Draw Chalkboard Inner Slate: box from -0.6 to 0.6
  const inBoard = Math.abs(nx) < 0.58 && Math.abs(ny) < 0.52;
  const inBoardBorder = inBoard && (Math.abs(nx) > 0.52 || Math.abs(ny) > 0.46);

  if (inBoardBorder) {
    // Slate subtle border
    return [51, 65, 85, 255]; // Slate-700
  }

  if (inBoard) {
    // Dark chalkboard texture background
    r = 16;
    g = 20;
    b = 30;
  }

  // Chalk Stroke 1: Diagonal neon cyan chalk pen line from (-0.35, 0.25) to (0.35, -0.25)
  // Distance from point to segment
  const x1 = -0.32, y1 = 0.28, x2 = 0.32, y2 = -0.28;
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const t = Math.max(0, Math.min(1, ((nx - x1) * (x2 - x1) + (ny - y1) * (y2 - y1)) / l2));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  const distToChalk = Math.hypot(nx - projX, ny - projY);

  if (distToChalk < 0.055) {
    // Cyan to Purple neon chalk stroke
    const cT = t;
    return [
      Math.round(6 * (1 - cT) + 192 * cT),
      Math.round(182 * (1 - cT) + 132 * cT),
      Math.round(212 * (1 - cT) + 252 * cT),
      255,
    ];
  }

  // Code Symbol: '<' on the left side centered around (-0.28, -0.05)
  // Top arm: from (-0.18, -0.22) to (-0.32, -0.05)
  // Bottom arm: from (-0.32, -0.05) to (-0.18, 0.12)
  const dArm1 = distToSegment(nx, ny, -0.18, -0.22, -0.32, -0.05);
  const dArm2 = distToSegment(nx, ny, -0.32, -0.05, -0.18, 0.12);
  if (Math.min(dArm1, dArm2) < 0.035) {
    return [56, 189, 248, 255]; // Cyan-400
  }

  // Code Symbol: '>' on the right side centered around (0.28, 0.05)
  // Top arm: from (0.18, -0.12) to (0.32, 0.05)
  // Bottom arm: from (0.32, 0.05) to (0.18, 0.22)
  const dArm3 = distToSegment(nx, ny, 0.18, -0.12, 0.32, 0.05);
  const dArm4 = distToSegment(nx, ny, 0.32, 0.05, 0.18, 0.22);
  if (Math.min(dArm3, dArm4) < 0.035) {
    return [168, 85, 247, 255]; // Purple-500
  }

  // Accent Sparkle Dot / Byte bit at (0.26, -0.32)
  if (Math.hypot(nx - 0.26, ny + 0.32) < 0.04) {
    return [250, 204, 21, 255]; // Amber yellow
  }

  // Accent Byte bit at (-0.26, 0.36)
  if (Math.hypot(nx + 0.26, ny - 0.36) < 0.035) {
    return [52, 211, 153, 255]; // Emerald green
  }

  return [r, g, b, a];
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Generate files
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const buildDir = path.join(rootDir, 'build');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

console.log('Generating ChalkByte 256x256 icon PNG & ICO...');
const png256 = createPNG(256, 256, renderChalkByteIcon);
const ico256 = createICO(png256, 256, 256);

// Write to public/ and build/
fs.writeFileSync(path.join(publicDir, 'icon.png'), png256);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico256);

// SVG Version
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect x="16" y="16" width="224" height="224" rx="56" fill="url(#bgGrad)" stroke="url(#neonGrad)" stroke-width="4" filter="url(#glow)" />
  <rect x="36" y="36" width="184" height="184" rx="36" fill="#0b0f19" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
  <!-- Code bracket < -->
  <path d="M 86 92 L 60 128 L 86 164" fill="none" stroke="#38bdf8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Diagonal Chalk Stroke -->
  <path d="M 96 168 L 160 88" fill="none" stroke="url(#neonGrad)" stroke-width="12" stroke-linecap="round" />
  <!-- Code bracket > -->
  <path d="M 170 92 L 196 128 L 170 164" fill="none" stroke="#c084fc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Yellow Byte Dot -->
  <circle cx="168" cy="68" r="7" fill="#facc15" />
  <!-- Emerald Byte Dot -->
  <circle cx="88" cy="188" r="6" fill="#34d399" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(buildDir, 'icon.svg'), svgContent);

console.log('Successfully generated ChalkByte icon assets in public/ and build/!');
