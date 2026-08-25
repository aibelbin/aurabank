import { deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Encodes an 8-bit greyscale PNG. Greyscale is all the shader needs — it reads
 * luminance only — and it keeps the atlas roughly a third the size of RGB.
 */
export function encodeGrayPng(width, height, pixels) {
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 2; // filter: Up — flat artwork compresses well against the row above
    for (let x = 0; x < width; x += 1) {
      const here = pixels[y * width + x];
      const above = y === 0 ? 0 : pixels[(y - 1) * width + x];
      raw[y * stride + 1 + x] = (here - above) & 0xff;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // colour type 0 = greyscale
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Encodes an 8-bit greyscale PNG with an alpha channel.
 *
 * The story atlas is opaque because a shader samples it. Artwork shown
 * directly on the page cannot be: it sits over the guilloché engraving, and an
 * opaque paper-coloured rectangle would punch a hole in it. Ink is drawn as
 * coverage instead — one flat ink colour, alpha carrying the anti-aliasing.
 *
 * @param coverage 0 = paper (transparent) … 255 = solid ink
 * @param ink      the grey level the ink is drawn in
 */
export function encodeGrayAlphaPng(width, height, coverage, ink = 10) {
  const stride = width * 2 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 2; // filter: Up
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const above = y === 0 ? 0 : coverage[index - width];
      const at = y * stride + 1 + x * 2;
      // Grey is constant, so its Up-filtered delta is zero on every row but the
      // first — which is why this compresses to almost nothing.
      raw[at] = (ink - (y === 0 ? 0 : ink)) & 0xff;
      raw[at + 1] = (coverage[index] - above) & 0xff;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 4; // colour type 4 = greyscale + alpha
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
