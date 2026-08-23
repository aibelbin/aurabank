/**
 * The roast-to-settlement toon, drawn frame by frame.
 *
 * Placeholder artwork: four acts of 24 frames — the roast, the impact, filing
 * the claim, settlement. Replacing it means replacing this module (or the atlas
 * it produces); nothing else knows how the frames are made.
 */
import { createSurface, fillDisc, fillRect, ring, stroke } from "./raster.mjs";

const FRAME_WIDTH = 480;
const FRAME_HEIGHT = 270;
const COLUMNS = 8;
const ROWS = 12;
const FRAME_COUNT = COLUMNS * ROWS; // 96 frames — 8 seconds on twos
const ACT_LENGTH = FRAME_COUNT / 4;

const PAPER = 245;
const INK = 25;
const TRACK = 220;
const GROUND = 228;
const ROASTER_X = 138;
const VICTIM_X = 342;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (value) => Math.min(1, Math.max(0, value));

function drawFigure(surface, config) {
  const {
    x,
    height = 172,
    lean = 0,
    squash = 1,
    mouth = 0,
    armRaise = 0,
    tilt = 0,
    ink = INK,
  } = config;

  const bodyHeight = height * squash;
  const headRadius = 21;
  const headY = GROUND - bodyHeight + headRadius;
  const hipY = GROUND - bodyHeight * 0.42;
  const shoulderY = GROUND - bodyHeight * 0.78;
  const headX = x + lean * 14 + tilt * 10;

  fillDisc(surface, headX, headY, headRadius, ink);
  // An open mouth is punched out of the head in paper, so it reads at any size.
  if (mouth > 0) fillDisc(surface, headX + 9, headY + 7, 3 + mouth * 7, PAPER);

  stroke(surface, headX, headY + headRadius, x, hipY, 13, ink);
  stroke(surface, x, hipY, x - 21, GROUND, 11, ink);
  stroke(surface, x, hipY, x + 21, GROUND, 11, ink);
  stroke(surface, x + lean * 8, shoulderY, x - 32, shoulderY + 34 - armRaise * 60, 10, ink);
  stroke(surface, x + lean * 8, shoulderY, x + 35, shoulderY + 31 - armRaise * 68, 10, ink);
}

function drawGround(surface) {
  fillRect(surface, 0, GROUND + 7, FRAME_WIDTH, 2, TRACK);
}

/** Two balance bars: the ledger, visible in every frame. */
function drawBalances(surface, roaster, victim) {
  const width = 132;
  const height = 10;
  const y = 250;
  fillRect(surface, 44, y, width, height, TRACK);
  fillRect(surface, 44, y, width * clamp01(roaster), height, INK);
  fillRect(surface, FRAME_WIDTH - 44 - width, y, width, height, TRACK);
  fillRect(
    surface,
    FRAME_WIDTH - 44 - width,
    y,
    width * clamp01(victim),
    height,
    INK,
  );
}

/** Expanding rings: the roast travelling across the frame. */
function drawRoast(surface, fromX, toX, y, progress) {
  for (let index = 0; index < 3; index += 1) {
    const staggered = clamp01(progress - index * 0.16);
    if (staggered <= 0) continue;
    const x = fromX + (toX - fromX) * staggered;
    const radius = 8 + staggered * 34;
    ring(surface, x, y, radius, 4.5, INK, 1 - staggered * 0.6);
  }
}

function drawPhone(surface, x, y, tilt) {
  const width = 34;
  const height = 58;
  fillRect(surface, x - width / 2 + tilt, y - height / 2, width, height, INK);
  fillRect(surface, x - width / 2 + 5 + tilt, y - height / 2 + 6, width - 10, height - 15, PAPER);
}

/** The claim form rising out of the phone, with lines of evidence on it. */
function drawClaim(surface, x, y, progress) {
  const width = 84;
  const height = 132 * progress;
  if (height < 6) return;
  fillRect(surface, x - width / 2, y - height, width, height, INK);
  fillRect(surface, x - width / 2 + 5, y - height + 5, width - 10, height - 10, PAPER);
  for (let line = 0; line < 4; line += 1) {
    const lineY = y - height + 16 + line * 17;
    if (lineY > y - 8) break;
    fillRect(surface, x - width / 2 + 13, lineY, width - 26 - line * 8, 4, INK);
  }
}

export function drawFrame(index) {
  const surface = createSurface(FRAME_WIDTH, FRAME_HEIGHT, PAPER);
  drawGround(surface);

  const act = Math.floor(index / ACT_LENGTH);
  const t = easeInOut((index % ACT_LENGTH) / (ACT_LENGTH - 1));

  let roasterBalance = 0.42;
  let victimBalance = 0.82;

  if (act === 0) {
    // The roast leaves the roaster's mouth.
    drawFigure(surface, { x: ROASTER_X, lean: t, mouth: t });
    drawFigure(surface, { x: VICTIM_X });
    drawRoast(surface, ROASTER_X + 44, ROASTER_X + 44 + t * 130, GROUND - 152, t);
  } else if (act === 1) {
    // It lands. The victim folds.
    drawFigure(surface, { x: ROASTER_X, lean: 1 - t * 0.4, mouth: 1 - t, armRaise: t * 0.7 });
    drawFigure(surface, { x: VICTIM_X, squash: 1 - t * 0.16, tilt: t * 1.2 });
    drawRoast(surface, ROASTER_X + 174, VICTIM_X - 34, GROUND - 152, 0.55 + t * 0.45);
    victimBalance = 0.82;
  } else if (act === 2) {
    // The claim is filed.
    drawFigure(surface, { x: ROASTER_X, armRaise: 0.85, mouth: 0 });
    drawFigure(surface, { x: VICTIM_X, squash: 0.84, tilt: 1.2 });
    drawPhone(surface, ROASTER_X + 38, GROUND - 158, 0);
    drawClaim(surface, ROASTER_X + 112, GROUND - 34, t);
  } else {
    // Settlement: the aura crosses the frame and the ledger moves.
    drawFigure(surface, { x: ROASTER_X, armRaise: 0.5 });
    drawFigure(surface, { x: VICTIM_X, squash: 0.84 + t * 0.02, tilt: 1.2 - t * 0.4 });

    const travel = easeInOut(t);
    const coinX = VICTIM_X - 38 - (VICTIM_X - 38 - (ROASTER_X + 38)) * travel;
    const coinY = GROUND - 138 - Math.sin(travel * Math.PI) * 44;
    ring(surface, coinX, coinY, 17, 6, INK);
    fillDisc(surface, coinX, coinY, 4.5, INK);

    roasterBalance = 0.42 + travel * 0.34;
    victimBalance = 0.82 - travel * 0.34;
  }

  drawBalances(surface, roasterBalance, victimBalance);
  return surface;
}


export const STORY_GEOMETRY = {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  COLUMNS,
  ROWS,
  FRAME_COUNT,
};
