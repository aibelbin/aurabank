import type { ImageFormat } from "./formats";

/**
 * Removes everything from an image that is not the image.
 *
 * A photo taken on a phone carries GPS coordinates, a device serial, and the
 * moment it was taken. An exhibit is meant to show a conversation, not where
 * the person who screenshotted it was standing. Nothing here re-encodes the
 * picture — the pixels are copied through untouched, and only the metadata
 * containers are dropped, so an exhibit is byte-for-byte the image that was
 * submitted minus the things nobody meant to submit.
 */
export function stripMetadata(bytes: Uint8Array, format: ImageFormat): Uint8Array {
  switch (format) {
    case "jpeg":
      return stripJpeg(bytes);
    case "png":
      return stripPng(bytes);
    case "webp":
      return stripWebp(bytes);
  }
}

/**
 * JPEG is a chain of marker segments. Exif lives in APP1, IPTC in APP13, and
 * XMP in either — so every APPn but APP0 goes, along with the comment marker.
 *
 * APP0 is JFIF: a handful of bytes of density information and nothing personal.
 * Dropping APP2 takes any embedded ICC profile with it, which can shift colours
 * very slightly on a wide-gamut screenshot. That is the right trade here: an
 * exhibit is read, not colour-matched.
 */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
  let index = 2;

  while (index < bytes.length) {
    if (bytes[index] !== 0xff) break; // not a marker: stop trusting the structure
    // Fill bytes: any number of 0xFF may precede a marker.
    while (index < bytes.length && bytes[index] === 0xff) index += 1;
    if (index >= bytes.length) break;

    const marker = bytes[index];
    index += 1;

    // Start of scan, or end of image: the rest is entropy-coded data. Copy it.
    if (marker === 0xd9 || marker === 0xda) {
      kept.push(bytes.subarray(index - 2));
      return concat(kept);
    }

    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(Uint8Array.of(0xff, marker));
      continue;
    }

    if (index + 2 > bytes.length) break;
    const length = (bytes[index] << 8) | bytes[index + 1];
    if (length < 2 || index + length > bytes.length) break;

    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) {
      kept.push(Uint8Array.of(0xff, marker), bytes.subarray(index, index + length));
    }

    index += length;
  }

  return concat(kept);
}

/**
 * PNG is a chunk stream, and anything not on this list is dropped.
 *
 * An allowlist rather than a denylist: eXIf and tEXt are the known carriers,
 * but a private chunk type nobody has heard of can hold anything at all, and
 * an exhibit has no use for one.
 */
const PNG_KEEP = new Set([
  "IHDR", "PLTE", "IDAT", "IEND",         // the image itself
  "tRNS", "gAMA", "cHRM", "sRGB", "sBIT", // how to render it
  "PLTE", "bKGD", "hIST", "pHYs",
  "acTL", "fcTL", "fdAT",                 // APNG frames
]);

function stripPng(bytes: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = [bytes.subarray(0, 8)]; // signature
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let index = 8;

  while (index + 8 <= bytes.length) {
    const length = view.getUint32(index);
    const type = String.fromCharCode(...bytes.subarray(index + 4, index + 8));
    const total = 12 + length; // length + type + data + crc
    if (index + total > bytes.length) break;

    if (PNG_KEEP.has(type)) kept.push(bytes.subarray(index, index + total));
    if (type === "IEND") break;

    index += total;
  }

  return concat(kept);
}

/**
 * WebP is RIFF. The EXIF and XMP chunks go, and the flags in VP8X that say
 * they are there have to go with them — a decoder that trusts the flag and
 * finds no chunk is entitled to reject the file.
 */
function stripWebp(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [];
  let index = 12; // "RIFF" + size + "WEBP"

  while (index + 8 <= bytes.length) {
    const fourcc = String.fromCharCode(...bytes.subarray(index, index + 4));
    const size = view.getUint32(index + 4, true);
    // Chunks are padded to an even length; the pad byte is not counted in size.
    const total = 8 + size + (size % 2);
    if (index + total > bytes.length) break;

    if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      const chunk = bytes.slice(index, index + total);
      if (fourcc === "VP8X" && chunk.length > 8) {
        // Clear the Exif (bit 3) and XMP (bit 2) flags in the feature byte.
        chunk[8] &= ~0b0000_1100;
      }
      kept.push(chunk);
    }

    index += total;
  }

  const body = concat(kept);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46]); // "RIFF"
  new DataView(header.buffer).setUint32(4, body.length + 4, true); // size covers "WEBP" + body
  header.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"

  return concat([header, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
