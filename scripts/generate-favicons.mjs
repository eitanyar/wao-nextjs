// Generates favicon/icon assets from Dana's locked spec.
// Master source: public/favicon.svg (rounded-square tile).
// A flat-square variant (no baked-in corner radius) is generated in-memory
// for apple-touch-icon, since iOS applies its own rounding mask.
//
// Run: node scripts/generate-favicons.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

const GLYPH_PATH =
  'M 7 17 L 13.5 23 L 26 8';
const STROKE = "#4AE3B5";
const STROKE_WIDTH = 5.2;
const BG = "#060709";

// Rounded-square tile (matches public/favicon.svg, source of truth).
const roundedSvg = fs.readFileSync(path.join(publicDir, "favicon.svg"), "utf8");

// Flat-square tile for apple-touch-icon (iOS masks its own rounding).
const flatSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="0" y="0" width="32" height="32" fill="${BG}"/>
  <path d="${GLYPH_PATH}" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

async function renderPng(svg, size, outPath) {
  const buf = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${size}x${size})`);
  return buf;
}

// Minimal ICO container that embeds PNG frames (valid per the ICO spec —
// modern browsers/OSes support PNG-compressed ICO entries).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  const images = [];
  let offset = dirSize;

  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    entries.push(entry);
    images.push(buf);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

async function main() {
  // public/icon-192.png, public/icon-512.png — rounded-square tile.
  await renderPng(roundedSvg, 192, path.join(publicDir, "icon-192.png"));
  await renderPng(roundedSvg, 512, path.join(publicDir, "icon-512.png"));

  // public/apple-touch-icon.png — flat square, no baked-in radius.
  await renderPng(flatSvg, 180, path.join(publicDir, "apple-touch-icon.png"));

  // src/app/favicon.ico — multi-res 16/32/48, rounded-square tile.
  const sizes = [16, 32, 48];
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(roundedSvg), { density: 384 })
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }
  const ico = buildIco(pngBuffers);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
  console.log(`wrote ${path.join(appDir, "favicon.ico")} (16/32/48 multi-res)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
