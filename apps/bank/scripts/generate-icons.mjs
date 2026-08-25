#!/usr/bin/env node
/**
 * Draws the app's icons, from nothing.
 *
 * Everything is local: no icon generator service, no design tool export
 * checked in as a binary nobody can regenerate. The mark is the AuraBank
 * monogram struck inside a stamp frame — the same double rule the ruling
 * stamp uses, which is the one piece of the interface people will remember.
 *
 *   node apps/bank/scripts/generate-icons.mjs
 */
import { crc32, deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../public/icons");

const INK = [0x0a, 0x0a, 0x0a];
const PAPER = [0xfa, 0xfa, 0xf8];

/** A minimal truecolour PNG encoder. Enough for flat marks, and nothing more. */
function encodePng(width, height, pixels) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixels[y * width + x];
      const at = row + 1 + x * 3;
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
    }
  }

  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body) >>> 0, 8 + data.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * @param size    pixels square
 * @param inset   fraction of the size kept clear at every edge. Maskable icons
 *                are cropped to a circle by the launcher, so the mark has to
 *                sit well inside the square or the launcher eats its corners.
 */
function drawMark(size, inset) {
  const pixels = new Array(size * size).fill(INK);
  const set = (x, y, colour) => {
    if (x >= 0 && y >= 0 && x < size && y < size) pixels[y * size + x] = colour;
  };

  const pad = Math.round(size * inset);
  const box = size - pad * 2;
  const rule = Math.max(1, Math.round(size * 0.022));
  const gap = Math.max(1, Math.round(size * 0.026));

  // The stamp's double frame, in paper on ink.
  const frame = (offset, thickness) => {
    for (let i = 0; i < thickness; i++) {
      const o = offset + i;
      for (let t = 0; t < box - o * 2; t++) {
        set(pad + o + t, pad + o, PAPER);
        set(pad + o + t, pad + box - 1 - o, PAPER);
        set(pad + o, pad + o + t, PAPER);
        set(pad + box - 1 - o, pad + o + t, PAPER);
      }
    }
  };
  frame(0, rule);
  frame(rule + gap, Math.max(1, Math.round(rule / 2)));

  // The monogram: two diagonals and a crossbar, scanline-filled.
  const inner = pad + rule + gap + rule * 2;
  const top = inner + Math.round(box * 0.1);
  const bottom = pad + box - (rule + gap + rule * 2) - Math.round(box * 0.1);
  const height = bottom - top;
  const centre = size / 2;
  const half = Math.round(box * 0.26);
  const stroke = Math.max(2, Math.round(box * 0.115));
  const apex = Math.round(stroke * 0.42);

  for (let y = top; y < bottom; y++) {
    const t = (y - top) / height;
    const leftEdge = Math.round(centre - apex - (half - apex) * t) - stroke / 2;
    const rightEdge = Math.round(centre + apex + (half - apex) * t) - stroke / 2;

    for (let i = 0; i < stroke; i++) {
      set(Math.round(leftEdge + i), y, PAPER);
      set(Math.round(rightEdge + i), y, PAPER);
    }

    // The crossbar, set low the way a stencilled A carries it.
    const barTop = top + Math.round(height * 0.66);
    if (y >= barTop && y < barTop + stroke) {
      for (let x = Math.round(leftEdge); x < Math.round(rightEdge + stroke); x++) {
        set(x, y, PAPER);
      }
    }
  }

  return pixels;
}

mkdirSync(OUT, { recursive: true });

const written = [];
for (const { name, size, inset } of [
  { name: "icon-192.png", size: 192, inset: 0.1 },
  { name: "icon-512.png", size: 512, inset: 0.1 },
  // Maskable: the mark pulled in so a circular crop cannot clip the frame.
  { name: "icon-maskable-512.png", size: 512, inset: 0.19 },
  // iOS does not read the manifest for its home-screen icon.
  { name: "apple-touch-icon.png", size: 180, inset: 0.08 },
]) {
  const file = join(OUT, name);
  writeFileSync(file, encodePng(size, size, drawMark(size, inset)));
  written.push(`${name} (${size}×${size})`);
}

console.log(`Wrote ${written.length} icons to apps/bank/public/icons:\n  ${written.join("\n  ")}`);
