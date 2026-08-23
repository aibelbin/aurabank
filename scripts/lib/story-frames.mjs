/**
 * The roast-to-settlement toon, drawn frame by frame.
 *
 * Each frame is a camera window onto a world three frames wide, so scrolling
 * pans the reader through a scene rather than watching a fixed stage: the
 * street where the roast lands, the kiosk where the claim is filed, and the
 * bank interior where an underwriter stamps it.
 *
 * Six acts of sixteen frames. Placeholder artwork — replacing it means
 * replacing this module; nothing else knows how the frames are made.
 */
import {
  createSurface,
  fillDisc,
  fillRect,
  fillSkewRect,
  ring,
  speedLines,
  stroke,
  ticks,
} from "./raster.mjs";

const FRAME_WIDTH = 480;
const FRAME_HEIGHT = 270;
const COLUMNS = 8;
const ROWS = 12;
const FRAME_COUNT = COLUMNS * ROWS; // 96 frames — 8 seconds on twos
const ACTS = 6;
const ACT_LENGTH = FRAME_COUNT / ACTS;
const WORLD_WIDTH = FRAME_WIDTH * 3;

const PAPER = 245;
const INK = 25;
const MID = 120;
const TRACK = 214;
const GROUND = 228;

// World positions. The camera travels left to right across these.
const ROASTER_X = 150;
const VICTIM_X = 340;
const KIOSK_X = 660;
const COUNTER_X = 1130;

/** Where the protagonist stands during each act, in world coordinates. */
const ANCHORS = [ROASTER_X, ROASTER_X, KIOSK_X - 92, KIOSK_X - 92, COUNTER_X - 150, COUNTER_X - 150];
/** Share of an act spent walking to a new anchor before the action starts. */
const WALK_SHARE = 0.34;
/** The protagonist sits a third of the way in, so the scene ahead is visible. */
const CAMERA_LEAD = 0.32;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;

/**
 * Splits an act into a walk to the new location and the action that happens
 * there. The camera follows the protagonist, so panning is always motivated by
 * someone moving rather than the frame drifting on its own.
 */
function stageFor(act, u) {
  const anchor = ANCHORS[act];
  const previous = act === 0 ? anchor : ANCHORS[act - 1];
  const walking = previous !== anchor && u < WALK_SHARE;

  const x = walking
    ? mix(previous, anchor, easeInOut(u / WALK_SHARE))
    : anchor;

  const action = previous !== anchor ? clamp01((u - WALK_SHARE) / (1 - WALK_SHARE)) : u;
  const camera = Math.min(
    WORLD_WIDTH - FRAME_WIDTH,
    Math.max(0, x - FRAME_WIDTH * CAMERA_LEAD),
  );

  return { x, camera, walking, action: easeInOut(action), rawAction: action };
}

/* ── Faces ────────────────────────────────────────────────────────────────── */

function drawFace(surface, hx, hy, radius, expression, facing = 1) {
  const eyeOffset = radius * 0.34;
  const eyeY = hy - radius * 0.18;

  const dot = (dx, r) => fillDisc(surface, hx + dx * facing, eyeY, r, PAPER);
  const slit = (dx) => fillRect(surface, hx + dx * facing - 4, eyeY - 1, 8, 2.5, PAPER);

  switch (expression) {
    case "smug":
      slit(-eyeOffset);
      slit(eyeOffset);
      // A short upturn at the corner of the mouth.
      fillRect(surface, hx + facing * 2, hy + radius * 0.42, 9, 2.5, PAPER);
      break;
    case "shout":
      slit(-eyeOffset);
      slit(eyeOffset);
      fillDisc(surface, hx + facing * 4, hy + radius * 0.4, radius * 0.3, PAPER);
      break;
    case "shock":
      dot(-eyeOffset, radius * 0.24);
      dot(eyeOffset, radius * 0.24);
      fillDisc(surface, hx, hy + radius * 0.42, radius * 0.26, PAPER);
      break;
    case "defeated":
      fillRect(surface, hx - eyeOffset * facing - 4, eyeY, 8, 2.5, PAPER);
      fillRect(surface, hx + eyeOffset * facing - 4, eyeY, 8, 2.5, PAPER);
      fillRect(surface, hx - 5, hy + radius * 0.45, 11, 2.5, PAPER);
      break;
    case "clerk":
      slit(-eyeOffset);
      slit(eyeOffset);
      fillRect(surface, hx - 5, hy + radius * 0.45, 11, 2.5, PAPER);
      break;
    default:
      dot(-eyeOffset, radius * 0.17);
      dot(eyeOffset, radius * 0.17);
      fillRect(surface, hx - 4, hy + radius * 0.45, 9, 2.5, PAPER);
  }
}

/* ── Figures ──────────────────────────────────────────────────────────────── */

function drawFigure(surface, config) {
  const {
    x,
    height = 172,
    lean = 0,
    squash = 1,
    tilt = 0,
    facing = 1,
    expression = "neutral",
    armLeft = { dx: -32, dy: 34 },
    armRight = { dx: 35, dy: 31 },
    walkPhase = null,
    ink = INK,
  } = config;

  const bodyHeight = height * squash;
  const headRadius = 21;
  const headY = GROUND - bodyHeight + headRadius;
  const hipY = GROUND - bodyHeight * 0.42;
  const shoulderY = GROUND - bodyHeight * 0.78;
  const headX = x + lean * 14 + tilt * 10;

  fillDisc(surface, headX, headY, headRadius, ink);
  drawFace(surface, headX, headY, headRadius, expression, facing);

  stroke(surface, headX, headY + headRadius, x, hipY, 13, ink);

  if (walkPhase === null) {
    stroke(surface, x, hipY, x - 21, GROUND, 11, ink);
    stroke(surface, x, hipY, x + 21, GROUND, 11, ink);
  } else {
    // Legs scissor and the trailing foot lifts, so the walk reads as a walk.
    const swing = Math.sin(walkPhase) * 24;
    stroke(surface, x, hipY, x + swing, GROUND - Math.max(0, Math.sin(walkPhase)) * 9, 11, ink);
    stroke(surface, x, hipY, x - swing, GROUND - Math.max(0, -Math.sin(walkPhase)) * 9, 11, ink);
  }

  const shoulderX = x + lean * 8;
  // Arms counter-swing against the legs while walking.
  const armSwing = walkPhase === null ? 0 : Math.sin(walkPhase) * 16;
  stroke(
    surface,
    shoulderX,
    shoulderY,
    x + armLeft.dx + armSwing,
    shoulderY + armLeft.dy,
    10,
    ink,
  );
  stroke(
    surface,
    shoulderX,
    shoulderY,
    x + armRight.dx - armSwing,
    shoulderY + armRight.dy,
    10,
    ink,
  );

  return {
    hand: { x: x + armRight.dx, y: shoulderY + armRight.dy },
    head: { x: headX, y: headY },
  };
}

/* ── Scenery ──────────────────────────────────────────────────────────────── */

function drawStreet(surface, wx) {
  fillRect(surface, 0, GROUND + 7, FRAME_WIDTH, 2, TRACK);
  ticks(surface, wx(0), GROUND + 11, WORLD_WIDTH, 48, 4, TRACK);
}

/** The filing kiosk: a plinth with a screen, out on the street. */
function drawKiosk(surface, wx) {
  const x = wx(KIOSK_X);
  fillRect(surface, x - 4, GROUND - 96, 8, 96, MID);
  fillRect(surface, x - 34, GROUND - 148, 68, 56, INK);
  fillRect(surface, x - 28, GROUND - 142, 56, 44, PAPER);
  for (let line = 0; line < 3; line += 1) {
    fillRect(surface, x - 21, GROUND - 133 + line * 12, 42 - line * 9, 3.5, MID);
  }
}

/** The bank: plinth, columns, arch. Reads as an institution at a glance. */
function drawBankFacade(surface, wx) {
  const left = wx(COUNTER_X - 210);
  const width = 420;

  fillRect(surface, left, GROUND - 6, width, 6, TRACK);
  for (let column = 0; column < 4; column += 1) {
    const x = left + 34 + column * 116;
    fillRect(surface, x, GROUND - 176, 20, 170, MID);
    fillRect(surface, x - 6, GROUND - 184, 32, 9, MID);
    fillRect(surface, x - 6, GROUND - 12, 32, 9, MID);
  }
  ring(surface, left + width / 2, GROUND - 186, 132, 7, MID, 0.9);
  fillRect(surface, left + 10, GROUND - 208, width - 20, 8, MID);
}

/** The counter the underwriter works behind. */
function drawCounter(surface, wx) {
  const x = wx(COUNTER_X);
  fillRect(surface, x - 96, GROUND - 74, 192, 82, MID);
  fillRect(surface, x - 104, GROUND - 82, 208, 10, INK);
  ticks(surface, x - 88, GROUND - 58, 176, 22, 30, TRACK);
}

/* ── Props ────────────────────────────────────────────────────────────────── */

function drawPhone(surface, x, y) {
  fillRect(surface, x - 15, y - 26, 30, 52, INK);
  fillRect(surface, x - 10, y - 20, 20, 38, PAPER);
}

/** A claim form, growing as it is filed. */
function drawClaim(surface, x, baseY, progress, lines = 4) {
  const width = 84;
  const height = 116 * clamp01(progress);
  if (height < 8) return null;

  const top = baseY - height;
  fillRect(surface, x - width / 2, top, width, height, INK);
  fillRect(surface, x - width / 2 + 5, top + 5, width - 10, height - 10, PAPER);
  for (let line = 0; line < lines; line += 1) {
    const lineY = top + 16 + line * 17;
    if (lineY > baseY - 14) break;
    fillRect(surface, x - width / 2 + 13, lineY, width - 26 - line * 8, 4, INK);
  }
  return { top, width };
}

/** A document lying flat on the counter, waiting to be stamped. */
function drawFlatSheet(surface, cx, cy, width, height, lines = 3) {
  fillRect(surface, cx - width / 2, cy - height / 2, width, height, INK);
  fillRect(surface, cx - width / 2 + 4, cy - height / 2 + 4, width - 8, height - 8, PAPER);
  for (let line = 0; line < lines; line += 1) {
    fillRect(surface, cx - width / 2 + 11, cy - height / 2 + 12 + line * 13, width - 30 - line * 9, 4, INK);
  }
}

/** Evidence: sheets sliding in and stacking at a careless angle. */
function drawEvidence(surface, x, y, progress) {
  const sheets = [
    { shear: 14, delay: 0 },
    { shear: -18, delay: 0.22 },
    { shear: 9, delay: 0.44 },
  ];

  sheets.forEach((sheet, index) => {
    const local = clamp01((progress - sheet.delay) / 0.5);
    if (local <= 0) return;
    const travel = easeInOut(local);
    const sheetX = mix(x + 150, x + index * 9 - 9, travel);
    const sheetY = y - index * 13;

    fillSkewRect(surface, sheetX - 27, sheetY - 34, 54, 68, sheet.shear, INK);
    fillSkewRect(surface, sheetX - 22, sheetY - 29, 44, 58, sheet.shear, PAPER);
    // A screenshot reads as a heavy bar over lighter ones.
    fillRect(surface, sheetX - 15, sheetY - 20, 30, 12, MID);
    fillRect(surface, sheetX - 15, sheetY - 4, 26, 3.5, MID);
    fillRect(surface, sheetX - 15, sheetY + 4, 20, 3.5, MID);

    if (local < 1) speedLines(surface, sheetX + 34, sheetY, 1, 3, TRACK);
  });
}

/** The underwriter's stamp, and the mark it leaves. */
function drawStamp(surface, x, y, progress, maxLift = 56) {
  // Two strikes: down, up, down again.
  const strike = Math.abs(Math.sin(progress * Math.PI * 2));
  const lift = mix(maxLift, 4, strike);

  fillRect(surface, x - 22, y - lift - 16, 44, 16, INK);
  fillRect(surface, x - 6, y - lift - 36, 12, 22, INK);
  fillDisc(surface, x, y - lift - 43, 11, INK);

  if (progress > 0.52) {
    const mark = clamp01((progress - 0.52) / 0.3);
    ring(surface, x, y + 8, 19 * mark, 5, MID, mark);
    fillRect(surface, x - 12 * mark, y + 6, 24 * mark, 4, MID);
  }
  if (strike > 0.86) speedLines(surface, x - 38, y - 4, -1, 3, TRACK);
}

/** The aura itself: a coin with a rim and radial ticks. */
function drawCoin(surface, x, y, spin) {
  ring(surface, x, y, 17, 6, INK);
  fillDisc(surface, x, y, 5, INK);
  for (let index = 0; index < 4; index += 1) {
    const angle = spin + (index * Math.PI) / 2;
    stroke(
      surface,
      x + Math.cos(angle) * 8,
      y + Math.sin(angle) * 8,
      x + Math.cos(angle) * 12,
      y + Math.sin(angle) * 12,
      3,
      INK,
    );
  }
}

/* ── The ledger, pinned to the frame rather than the world ─────────────────── */

function drawLedger(surface, roaster, victim) {
  const width = 132;
  const height = 10;
  const y = 250;

  const bar = (x, fraction) => {
    fillRect(surface, x, y, width, height, TRACK);
    fillRect(surface, x, y, width * clamp01(fraction), height, INK);
    ticks(surface, x, y - 6, width, width / 4, 4, TRACK);
  };

  bar(44, roaster);
  bar(FRAME_WIDTH - 44 - width, victim);
}

/* ── Frames ───────────────────────────────────────────────────────────────── */

export function drawFrame(index) {
  const surface = createSurface(FRAME_WIDTH, FRAME_HEIGHT, PAPER);
  const act = Math.min(ACTS - 1, Math.floor(index / ACT_LENGTH));
  const u = (index % ACT_LENGTH) / (ACT_LENGTH - 1);
  const stage = stageFor(act, u);
  const t = stage.action;
  const wx = (worldX) => worldX - stage.camera;
  const heroX = wx(stage.x);
  // Four steps across a walk, so the gait reads at twelve frames a second.
  const gait = stage.walking ? (u / WALK_SHARE) * Math.PI * 4 : null;

  drawStreet(surface, wx);
  drawKiosk(surface, wx);
  drawBankFacade(surface, wx);

  let roasterBalance = 0.42;
  let victimBalance = 0.82;

  if (act === 0) {
    // The roast leaves the roaster's mouth and crosses the street.
    drawFigure(surface, {
      x: heroX,
      lean: t,
      expression: t > 0.35 ? "shout" : "smug",
      armRight: { dx: mix(35, 52, t), dy: mix(31, -6, t) },
    });
    drawFigure(surface, { x: wx(VICTIM_X), facing: -1, expression: "neutral" });
    for (let wave = 0; wave < 3; wave += 1) {
      const local = clamp01(t - wave * 0.16);
      if (local <= 0) continue;
      const x = mix(heroX + 46, wx(VICTIM_X) - 30, local);
      ring(surface, x, GROUND - 152, 9 + local * 32, 4.5, INK, 1 - local * 0.55);
    }
  } else if (act === 1) {
    // It lands. Arms up, then a slump.
    drawFigure(surface, {
      x: heroX,
      lean: 1 - t * 0.5,
      expression: "smug",
      armRight: { dx: 48, dy: mix(-6, 10, t) },
    });
    drawFigure(surface, {
      x: wx(VICTIM_X),
      facing: -1,
      squash: 1 - t * 0.17,
      tilt: t * 1.3,
      expression: t > 0.55 ? "defeated" : "shock",
      armLeft: { dx: mix(-32, -44, t), dy: mix(34, -30, Math.sin(t * Math.PI)) },
      armRight: { dx: mix(35, 44, t), dy: mix(31, -28, Math.sin(t * Math.PI)) },
    });
    ring(surface, wx(VICTIM_X) - 4, GROUND - 152, mix(38, 74, t), 5, INK, 1 - t);
    if (t < 0.5) speedLines(surface, wx(VICTIM_X) + 44, GROUND - 120, 1, 3, MID);
  } else if (act === 2 || act === 3) {
    // At the kiosk: the claim is filed, then evidence is attached to it.
    const filing = act === 2;
    // The victim is still slumped back down the street; leaving them in shot
    // keeps the two halves of the story connected as the camera travels.
    drawFigure(surface, {
      x: wx(VICTIM_X),
      facing: -1,
      squash: 0.83,
      tilt: 1.3,
      expression: "defeated",
      armLeft: { dx: -44, dy: 34 },
      armRight: { dx: 44, dy: 31 },
    });
    const figure = drawFigure(surface, {
      x: heroX,
      expression: "smug",
      walkPhase: gait,
      armRight: stage.walking ? { dx: 35, dy: 31 } : { dx: 44, dy: -34 },
    });
    if (!stage.walking) {
      drawPhone(surface, figure.hand.x, figure.hand.y);
      drawClaim(surface, wx(KIOSK_X) + 66, GROUND - 22, filing ? t : 1);
      if (!filing) drawEvidence(surface, wx(KIOSK_X) + 66, GROUND - 118, t);
    }
    if (stage.walking) speedLines(surface, heroX - 40, GROUND - 96, -1, 3, TRACK);
  } else {
    // Behind the counter: the underwriter reviews by hand, then it settles.
    const settling = act === 5;

    // The clerk is drawn before the counter, so the counter occludes them.
    if (!stage.walking) {
      drawFigure(surface, {
        x: wx(COUNTER_X) + 54,
        facing: -1,
        height: 150,
        expression: "clerk",
        armLeft: { dx: settling ? -34 : -30, dy: settling ? -8 : 10 },
        armRight: { dx: settling ? -30 : -46, dy: settling ? 12 : -16 },
      });
    }
    drawCounter(surface, wx);

    drawFigure(surface, {
      x: heroX,
      expression: settling ? "smug" : "neutral",
      walkPhase: gait,
      armRight: stage.walking
        ? { dx: 35, dy: 31 }
        : settling
          ? { dx: mix(30, 46, t), dy: mix(14, -22, t) }
          : { dx: 30, dy: 14 },
    });
    if (stage.walking) speedLines(surface, heroX - 40, GROUND - 96, -1, 3, TRACK);

    if (!stage.walking && !settling) {
      drawFlatSheet(surface, wx(COUNTER_X) - 20, GROUND - 96, 96, 56, 3);
      drawStamp(surface, wx(COUNTER_X) - 20, GROUND - 100, t);
    }

    if (settling) {
      const travel = t;
      const coinX = mix(wx(COUNTER_X) + 30, wx(COUNTER_X) - 122, travel);
      const coinY = GROUND - 118 - Math.sin(travel * Math.PI) * 44;
      drawCoin(surface, coinX, coinY, travel * 6);
      if (travel > 0.08 && travel < 0.92) speedLines(surface, coinX + 30, coinY, 1, 3, TRACK);

      roasterBalance = 0.42 + travel * 0.34;
      victimBalance = 0.82 - travel * 0.34;
    } else {
      // The ledger has not moved yet, but the claim is already logged.
      roasterBalance = 0.42;
      victimBalance = 0.82;
    }
  }

  drawLedger(surface, roasterBalance, victimBalance);
  return surface;
}

export const STORY_GEOMETRY = {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  COLUMNS,
  ROWS,
  FRAME_COUNT,
};
