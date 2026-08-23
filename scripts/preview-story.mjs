/** Renders a contact sheet of selected frames, for eyeballing the animation. */
import { writeFileSync } from "node:fs";
import { encodeGrayPng } from "./lib/gray-png.mjs";
import { blit, createSurface } from "./lib/raster.mjs";
import { drawFrame, STORY_GEOMETRY } from "./lib/story-frames.mjs";

const { FRAME_WIDTH, FRAME_HEIGHT, FRAME_COUNT } = STORY_GEOMETRY;
const COLUMNS = 4;
const picks = Array.from({ length: 12 }, (_, index) =>
  Math.min(FRAME_COUNT - 1, Math.round((index * FRAME_COUNT) / 12)),
);

const rows = Math.ceil(picks.length / COLUMNS);
const sheet = createSurface(FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * rows, 255);

picks.forEach((frame, position) => {
  blit(
    sheet,
    drawFrame(frame),
    (position % COLUMNS) * FRAME_WIDTH,
    Math.floor(position / COLUMNS) * FRAME_HEIGHT,
  );
});

const target = process.argv[2] ?? "story-preview.png";
writeFileSync(target, encodeGrayPng(sheet.width, sheet.height, sheet.pixels));
console.log(`frames ${picks.join(", ")} -> ${target}`);
