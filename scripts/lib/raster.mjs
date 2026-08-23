/** Minimal software rasteriser: enough primitives to draw a stick-figure toon. */
export function createSurface(width, height, background = 245) {
  const pixels = new Uint8Array(width * height).fill(background);
  return { width, height, pixels };
}

function blend(surface, x, y, value, coverage) {
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return;
  if (coverage <= 0) return;
  const index = y * surface.width + x;
  const existing = surface.pixels[index];
  surface.pixels[index] = Math.round(existing + (value - existing) * Math.min(1, coverage));
}

export function fillRect(surface, x, y, width, height, value) {
  for (let row = Math.floor(y); row < Math.ceil(y + height); row += 1) {
    for (let column = Math.floor(x); column < Math.ceil(x + width); column += 1) {
      blend(surface, column, row, value, 1);
    }
  }
}

export function fillDisc(surface, cx, cy, radius, value) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y += 1) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      // One pixel of feathering keeps the silhouette from stair-stepping.
      blend(surface, x, y, value, radius + 0.5 - distance);
    }
  }
}

export function ring(surface, cx, cy, radius, thickness, value, coverage = 1) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  for (let y = Math.floor(cy - outer - 1); y <= Math.ceil(cy + outer + 1); y += 1) {
    for (let x = Math.floor(cx - outer - 1); x <= Math.ceil(cx + outer + 1); x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      const band = Math.min(outer - distance, distance - inner) + 0.5;
      blend(surface, x, y, value, Math.min(1, band) * coverage);
    }
  }
}

export function stroke(surface, x0, y0, x1, y1, thickness, value) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    fillDisc(surface, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, value);
  }
}

/**
 * A rectangle whose rows slide sideways as they rise — a cheap stand-in for
 * rotation, which the rasteriser has no transform stack for. Good enough to
 * make stacked sheets of paper look tossed rather than filed.
 */
export function fillSkewRect(surface, x, y, width, height, shear, value) {
  for (let row = 0; row < height; row += 1) {
    const offset = shear * (row / Math.max(1, height) - 0.5);
    fillRect(surface, x + offset, y + row, width, 1, value);
  }
}

/** Short parallel dashes trailing a moving object. Classic toon shorthand. */
export function speedLines(surface, x, y, direction, count, value) {
  for (let index = 0; index < count; index += 1) {
    const offset = index * 9 - ((count - 1) * 9) / 2;
    const length = 14 - Math.abs(index - (count - 1) / 2) * 4;
    fillRect(surface, x - (direction > 0 ? length : 0), y + offset, length, 2.5, value);
  }
}

/** Evenly spaced ticks along a horizontal line — a measuring scale. */
export function ticks(surface, x, y, width, spacing, height, value) {
  for (let offset = 0; offset <= width; offset += spacing) {
    fillRect(surface, x + offset, y, 1.5, height, value);
  }
}

/** Copies a frame surface into the atlas at a grid cell. */
export function blit(atlas, surface, originX, originY) {
  for (let y = 0; y < surface.height; y += 1) {
    const target = (originY + y) * atlas.width + originX;
    atlas.pixels.set(surface.pixels.subarray(y * surface.width, (y + 1) * surface.width), target);
  }
}
