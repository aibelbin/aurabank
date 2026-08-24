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

/** Copies a frame surface into the atlas at a grid cell. */
export function blit(atlas, surface, originX, originY) {
  for (let y = 0; y < surface.height; y += 1) {
    const target = (originY + y) * atlas.width + originX;
    atlas.pixels.set(surface.pixels.subarray(y * surface.width, (y + 1) * surface.width), target);
  }
}
