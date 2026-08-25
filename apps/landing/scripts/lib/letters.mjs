/**
 * A stencil alphabet, drawn as line segments.
 *
 * There is no font rasteriser here and there is not going to be one: adding a
 * text engine to draw eight words would be a far larger dependency than the
 * words are worth. Each glyph is a handful of segments on a unit box, which
 * is also why they look stencilled — and a stencil is the right register for
 * a word bursting out of a fight.
 *
 * Coordinates run 0…1 across and 0…1 down, so a glyph scales by multiplication.
 */
import { stroke } from "./raster.mjs";

/** Advance width of a glyph, as a fraction of its height. */
const WIDTH = 0.62;

const GLYPHS = {
  A: [[0, 1, 0.31, 0], [0.31, 0, 0.62, 1], [0.12, 0.62, 0.5, 0.62]],
  B: [[0, 0, 0, 1], [0, 0, 0.45, 0], [0.45, 0, 0.58, 0.24], [0.58, 0.24, 0.45, 0.48],
      [0.45, 0.48, 0, 0.48], [0.45, 0.48, 0.62, 0.74], [0.62, 0.74, 0.45, 1], [0.45, 1, 0, 1]],
  C: [[0.62, 0.16, 0.4, 0], [0.4, 0, 0.14, 0], [0.14, 0, 0, 0.28], [0, 0.28, 0, 0.72],
      [0, 0.72, 0.14, 1], [0.14, 1, 0.4, 1], [0.4, 1, 0.62, 0.84]],
  D: [[0, 0, 0, 1], [0, 0, 0.38, 0], [0.38, 0, 0.62, 0.32], [0.62, 0.32, 0.62, 0.68],
      [0.62, 0.68, 0.38, 1], [0.38, 1, 0, 1]],
  E: [[0.62, 0, 0, 0], [0, 0, 0, 1], [0, 1, 0.62, 1], [0, 0.5, 0.46, 0.5]],
  F: [[0.62, 0, 0, 0], [0, 0, 0, 1], [0, 0.5, 0.46, 0.5]],
  G: [[0.62, 0.16, 0.4, 0], [0.4, 0, 0.14, 0], [0.14, 0, 0, 0.28], [0, 0.28, 0, 0.72],
      [0, 0.72, 0.14, 1], [0.14, 1, 0.44, 1], [0.44, 1, 0.62, 0.8], [0.62, 0.8, 0.62, 0.56],
      [0.62, 0.56, 0.34, 0.56]],
  H: [[0, 0, 0, 1], [0.62, 0, 0.62, 1], [0, 0.52, 0.62, 0.52]],
  I: [[0.08, 0, 0.54, 0], [0.31, 0, 0.31, 1], [0.08, 1, 0.54, 1]],
  J: [[0.62, 0, 0.62, 0.76], [0.62, 0.76, 0.44, 1], [0.44, 1, 0.18, 1], [0.18, 1, 0, 0.78]],
  K: [[0, 0, 0, 1], [0.62, 0, 0.04, 0.56], [0.22, 0.42, 0.62, 1]],
  L: [[0, 0, 0, 1], [0, 1, 0.6, 1]],
  M: [[0, 1, 0, 0], [0, 0, 0.31, 0.5], [0.31, 0.5, 0.62, 0], [0.62, 0, 0.62, 1]],
  N: [[0, 1, 0, 0], [0, 0, 0.62, 1], [0.62, 1, 0.62, 0]],
  O: [[0.16, 0, 0.46, 0], [0.46, 0, 0.62, 0.26], [0.62, 0.26, 0.62, 0.74],
      [0.62, 0.74, 0.46, 1], [0.46, 1, 0.16, 1], [0.16, 1, 0, 0.74], [0, 0.74, 0, 0.26],
      [0, 0.26, 0.16, 0]],
  P: [[0, 1, 0, 0], [0, 0, 0.44, 0], [0.44, 0, 0.62, 0.26], [0.62, 0.26, 0.44, 0.52],
      [0.44, 0.52, 0, 0.52]],
  Q: [[0.16, 0, 0.46, 0], [0.46, 0, 0.62, 0.26], [0.62, 0.26, 0.62, 0.74],
      [0.62, 0.74, 0.46, 1], [0.46, 1, 0.16, 1], [0.16, 1, 0, 0.74], [0, 0.74, 0, 0.26],
      [0, 0.26, 0.16, 0], [0.38, 0.7, 0.68, 1.06]],
  R: [[0, 1, 0, 0], [0, 0, 0.44, 0], [0.44, 0, 0.62, 0.26], [0.62, 0.26, 0.44, 0.52],
      [0.44, 0.52, 0, 0.52], [0.3, 0.52, 0.62, 1]],
  S: [[0.62, 0.14, 0.42, 0], [0.42, 0, 0.16, 0], [0.16, 0, 0, 0.22], [0, 0.22, 0.16, 0.46],
      [0.16, 0.46, 0.46, 0.54], [0.46, 0.54, 0.62, 0.76], [0.62, 0.76, 0.44, 1],
      [0.44, 1, 0.16, 1], [0.16, 1, 0, 0.86]],
  T: [[0, 0, 0.62, 0], [0.31, 0, 0.31, 1]],
  U: [[0, 0, 0, 0.74], [0, 0.74, 0.18, 1], [0.18, 1, 0.44, 1], [0.44, 1, 0.62, 0.74],
      [0.62, 0.74, 0.62, 0]],
  V: [[0, 0, 0.31, 1], [0.31, 1, 0.62, 0]],
  W: [[0, 0, 0.12, 1], [0.12, 1, 0.31, 0.4], [0.31, 0.4, 0.5, 1], [0.5, 1, 0.62, 0]],
  X: [[0, 0, 0.62, 1], [0.62, 0, 0, 1]],
  Y: [[0, 0, 0.31, 0.52], [0.62, 0, 0.31, 0.52], [0.31, 0.52, 0.31, 1]],
  Z: [[0, 0, 0.62, 0], [0.62, 0, 0, 1], [0, 1, 0.62, 1]],
  0: [[0.16, 0, 0.46, 0], [0.46, 0, 0.62, 0.26], [0.62, 0.26, 0.62, 0.74],
      [0.62, 0.74, 0.46, 1], [0.46, 1, 0.16, 1], [0.16, 1, 0, 0.74], [0, 0.74, 0, 0.26],
      [0, 0.26, 0.16, 0], [0.1, 0.84, 0.52, 0.16]],
  1: [[0.1, 0.2, 0.34, 0], [0.34, 0, 0.34, 1], [0.1, 1, 0.58, 1]],
  2: [[0, 0.2, 0.2, 0], [0.2, 0, 0.46, 0], [0.46, 0, 0.62, 0.24], [0.62, 0.24, 0, 1],
      [0, 1, 0.62, 1]],
  3: [[0, 0.06, 0.44, 0.06], [0.44, 0.06, 0.6, 0.3], [0.6, 0.3, 0.34, 0.5],
      [0.34, 0.5, 0.62, 0.72], [0.62, 0.72, 0.44, 1], [0.44, 1, 0.04, 0.94]],
  4: [[0.46, 0, 0, 0.68], [0, 0.68, 0.62, 0.68], [0.46, 0.3, 0.46, 1]],
  5: [[0.62, 0, 0.06, 0], [0.06, 0, 0, 0.44], [0, 0.44, 0.4, 0.4], [0.4, 0.4, 0.62, 0.64],
      [0.62, 0.64, 0.44, 1], [0.44, 1, 0.04, 0.94]],
  6: [[0.56, 0.04, 0.22, 0.04], [0.22, 0.04, 0, 0.4], [0, 0.4, 0, 0.8], [0, 0.8, 0.2, 1],
      [0.2, 1, 0.44, 1], [0.44, 1, 0.62, 0.76], [0.62, 0.76, 0.42, 0.54], [0.42, 0.54, 0, 0.58]],
  7: [[0, 0, 0.62, 0], [0.62, 0, 0.26, 1]],
  8: [[0.18, 0.48, 0.02, 0.26], [0.02, 0.26, 0.18, 0], [0.18, 0, 0.44, 0], [0.44, 0, 0.6, 0.26],
      [0.6, 0.26, 0.44, 0.48], [0.44, 0.48, 0.62, 0.74], [0.62, 0.74, 0.44, 1],
      [0.44, 1, 0.18, 1], [0.18, 1, 0, 0.74], [0, 0.74, 0.18, 0.48], [0.18, 0.48, 0.44, 0.48]],
  9: [[0.62, 0.6, 0.2, 0.56], [0.2, 0.56, 0, 0.34], [0, 0.34, 0.18, 0.04], [0.18, 0.04, 0.44, 0.04],
      [0.44, 0.04, 0.62, 0.26], [0.62, 0.26, 0.62, 0.66], [0.62, 0.66, 0.4, 0.98],
      [0.4, 0.98, 0.06, 0.96]],
  "!": [[0.3, 0, 0.3, 0.66], [0.3, 0.86, 0.3, 1]],
  "+": [[0.06, 0.5, 0.56, 0.5], [0.31, 0.26, 0.31, 0.74]],
  "−": [[0.06, 0.5, 0.56, 0.5]],
  " ": [],
};

/** How wide a word will be, in the same units as `size`. */
export function measureWord(word, size, tracking = 0.16) {
  const glyphs = [...word.toUpperCase()];
  return glyphs.length * size * (WIDTH + tracking) - size * tracking;
}

/**
 * Draws a word centred on (cx, cy).
 *
 * `slant` shears the whole word, which is what makes it read as shouted rather
 * than set. `weight` is in the same pixels as everything else.
 */
export function drawWord(surface, word, options) {
  const { cx, cy, size, weight = size * 0.16, slant = 0, ink, tracking = 0.16 } = options;

  const glyphs = [...word.toUpperCase()];
  const advance = size * (WIDTH + tracking);
  const total = measureWord(word, size, tracking);
  let penX = cx - total / 2;
  const top = cy - size / 2;

  for (const character of glyphs) {
    const segments = GLYPHS[character];
    if (segments) {
      for (const [x0, y0, x1, y1] of segments) {
        // Shear about the vertical centre, so the word leans without drifting.
        const shear = (y) => slant * (0.5 - y) * size;
        stroke(
          surface,
          penX + x0 * size + shear(y0),
          top + y0 * size,
          penX + x1 * size + shear(y1),
          top + y1 * size,
          weight,
          ink,
        );
      }
    }
    penX += advance;
  }
}

/**
 * The spiked outline a comic word bursts out of.
 *
 * Outline only — the artwork is one ink colour on transparency, so there is no
 * paper to knock a hole in. Over the guilloché that reads correctly anyway:
 * an engraved page with something stamped on top of it.
 */
export function drawBurst(surface, options) {
  const { cx, cy, radiusX, radiusY, spikes = 11, jag = 0.34, weight = 3, ink, phase = 0 } = options;

  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 + phase;
    // Alternating long and short points, with a wobble so no two spikes match.
    const reach = i % 2 === 0 ? 1 : 1 - jag - 0.06 * Math.sin(i * 2.7 + phase * 3);
    points.push([cx + Math.cos(angle) * radiusX * reach, cy + Math.sin(angle) * radiusY * reach]);
  }

  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    stroke(surface, x0, y0, x1, y1, weight, ink);
  }
}
