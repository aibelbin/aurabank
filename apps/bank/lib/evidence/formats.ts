export type ImageFormat = "png" | "jpeg" | "webp";

export const ACCEPTED_MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const EXTENSION: Record<ImageFormat, string> = {
  png: ".png",
  jpeg: ".jpg",
  webp: ".webp",
};

/** Five megabytes. A phone screenshot is a tenth of that; a photo, about half. */
export const MAX_BYTES = 5 * 1024 * 1024;

/** At most this many plates on one case, so a sheet stays readable. */
export const MAX_EXHIBITS = 6;

/**
 * What the bytes actually are, ignoring what the upload claimed.
 *
 * A browser's Content-Type comes from the client and a filename extension
 * comes from whoever named the file. Neither is evidence of anything. The
 * first few bytes are.
 */
export function sniffFormat(bytes: Uint8Array): ImageFormat | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}
