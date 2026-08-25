/**
 * Two members settling a matter the old way, drawn frame by frame.
 *
 * A loop, not a scrub: it plays on its own beneath the copy that explains what
 * the bank is for. The joke is that the fight decides nothing — the aura only
 * moves at the end, and exactly as much leaves one figure as reaches the other.
 * That is the zero-sum claim, made by the picture instead of by a paragraph.
 *
 * Everything below is drawn from a skeleton: a pose is a handful of angles and
 * offsets, and one transform rotates the whole figure about its hips. That is
 * what makes a somersault three lines of choreography rather than a rewrite.
 *
 * Placeholder artwork in the same sense as the story atlas: replacing it means
 * replacing this module, and nothing else knows how the frames are made.
 */
import { createSurface, fillDisc, stroke } from "./raster.mjs";
import { drawBurst, drawWord, measureWord } from "./letters.mjs";

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 350;
const COLUMNS = 8;
const ROWS = 6;
const FRAME_COUNT = COLUMNS * ROWS; // 48 frames — three seconds at sixteen a second

/** Drawn as coverage: 0 is paper, 255 is solid ink. */
const PAPER = 0;
const INK = 255;

// Low in the frame: the somersault needs headroom, and a stage with air above
// it reads as a stage rather than as a strip of ground.
const GROUND = 300;
const CENTRE = FRAME_WIDTH / 2;

/**
 * How large the figures are drawn against the stage.
 *
 * One number rather than a hundred tuned offsets: the skeleton below is
 * written at a nominal size and multiplied through here, so filling more of
 * the band is a single edit. Raising it means re-checking the leap — the whole
 * point of the headroom above is that a somersaulting head stays inside it.
 */
const SCALE = 1.22;
const s = (value) => value * SCALE;

const HIP_HEIGHT = s(58);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a, b, t) => a + (b - a) * t;
/** A single hit: rises instantly, falls away. */
const spike = (t) => Math.sin(clamp01(t) * Math.PI) ** 2;

/* ── marks ───────────────────────────────────────────────────────────────── */

/** The arc a blade leaves behind it. The swing is the drawing, not the sword. */
function swoosh(surface, cx, cy, radius, fromAngle, toAngle, weight, strength) {
  if (strength <= 0) return;
  const steps = 22;
  for (let i = 0; i < steps; i += 1) {
    const a0 = lerp(fromAngle, toAngle, i / steps);
    const a1 = lerp(fromAngle, toAngle, (i + 1) / steps);
    // Tapers to nothing at the trailing end, the way a swipe does.
    const taper = (i / steps) ** 0.6;
    stroke(
      surface,
      cx + Math.cos(a0) * radius,
      cy + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius,
      cy + Math.sin(a1) * radius,
      weight * taper,
      INK * strength * taper,
    );
  }
}

/** Horizontal streaks behind something moving fast. */
function speedLines(surface, x, y, direction, strength, spread = 34) {
  if (strength <= 0) return;
  for (let i = 0; i < 4; i += 1) {
    const offset = (i - 1.5) * (spread / 3);
    const length = (26 + i * 9) * strength;
    stroke(
      surface,
      x - direction * 10,
      y + offset,
      x - direction * (10 + length),
      y + offset,
      2.4,
      INK * 0.55 * strength,
    );
  }
}

/** The burst where steel meets steel. */
function impact(surface, x, y, strength) {
  if (strength <= 0) return;
  const rays = 7;
  for (let i = 0; i < rays; i += 1) {
    // Irregular lengths: an even star reads as a symbol, not a collision.
    const angle = (i / rays) * Math.PI * 2 + 0.4;
    const length = (10 + ((i * 7) % 13) + 20 * strength) * (0.6 + 0.4 * strength);
    stroke(
      surface,
      x + Math.cos(angle) * 5,
      y + Math.sin(angle) * 5,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
      3,
      INK * strength,
    );
  }
  fillDisc(surface, x, y, 4 + 5 * strength, INK * strength);
}

/**
 * A word thrown out of a hit.
 *
 * Three frames and gone: a beat before it registers, an overshoot, then a
 * fade as it drifts up. Held any longer and it stops reading as a noise and
 * starts reading as a label.
 */
const HIT_WORDS = [
  // Ambient, in the quiet frames: aura and sigma going off around the fight.
  // These used to be a second animated layer on a period that never lined up
  // with this one, which read as genuine randomness — and cost a second sheet
  // in texture memory beside a WebGL canvas that already holds the story atlas.
  // Folded in here instead: one loop, one sheet, still something to look at
  // while the two square up.
  { at: 2, text: "AURA", dx: -250, dy: -196, size: 26, quiet: true },
  { at: 7, text: "SIGMA", dx: 210, dy: -214, size: 28, quiet: true },
  { at: 45, text: "+250", dx: 200, dy: -206, size: 24, quiet: true },

  { at: 13, text: "KLANG!", dx: 0, dy: -212, size: 34 },
  { at: 17, text: "WHAM!", dx: 96, dy: -190, size: 30 },
  { at: 19, text: "KRAK!", dx: -104, dy: -204, size: 28 },
  { at: 21, text: "SHING!", dx: 84, dy: -216, size: 29 },
  { at: 23, text: "AURA!", dx: -92, dy: -196, size: 30 },
  { at: 32, text: "SIGMA!", dx: 40, dy: -228, size: 38 },
  { at: 40, text: "SETTLED!", dx: -30, dy: -238, size: 30 },
];

/** Grows past its final size on the second frame, the way a shout lands. */
const POP_SCALE = [0.78, 1.06, 0.98];
const POP_FADE = [1, 1, 0.42];

function drawHitWords(surface, index) {
  for (const hit of HIT_WORDS) {
    const age = index - hit.at;
    if (age < 0 || age >= POP_SCALE.length) continue;

    const size = hit.size * POP_SCALE[age];
    // A shout that nobody threw is weather, not an impact: lighter, and with
    // no burst around it.
    const ink = INK * POP_FADE[age] * (hit.quiet ? 0.55 : 1);
    const cx = CENTRE + hit.dx;
    const cy = GROUND + hit.dy - age * 11;

    if (!hit.quiet) {
      drawBurst(surface, {
        cx,
        cy,
        // The inner spikes cut in to about two thirds, so the padding has to
        // clear that, not just the word.
        radiusX: measureWord(hit.text, size) / 2 + size * 1.05,
        radiusY: size * 1.15,
        spikes: 11,
        weight: 3,
        ink,
        // Seeded off the frame it belongs to, so no two bursts have the same
        // spikes — an identical star twice reads as a stamp, not an impact.
        phase: hit.at * 0.7,
      });
    }
    drawWord(surface, hit.text, { cx, cy, size, ink, slant: 0.2, weight: size * 0.17 });
  }
}

/* ── the figure ──────────────────────────────────────────────────────────── */

/**
 * A ninja, posed by angles and drawn through one transform.
 *
 * `spin` rotates every joint about the hips, so a somersault costs one number.
 * `lift` raises the hips off the ground, so a leap costs one more.
 */
function drawNinja(surface, pose) {
  const {
    x,
    facing,
    spin = 0,
    lift = 0,
    crouch = 0,
    lean = 0,
    stride = 0,
    reach = 0,
    swordAngle = -0.5,
    offArm = 0,
    stature = 0,
    scarf = 0,
  } = pose;

  const hipX = x;
  const hipY = GROUND - HIP_HEIGHT - lift + crouch - stature;
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);

  // Local space: hips at the origin, y downward, before the spin is applied.
  const at = (lx, ly) => [hipX + lx * cos - ly * sin, hipY + lx * sin + ly * cos];

  const shoulder = at(s(lean * facing), s(-44));
  const head = at(s(lean * facing + facing * 3), s(-66));
  const frontFoot = at(s(facing * (26 + stride)), s(58) - crouch);
  const backFoot = at(s(-facing * (22 + stride * 0.45)), s(58) - crouch);
  const hand = at(s(facing * (26 + reach)), s(-34));
  const offHand = at(s(-facing * (22 + offArm)), s(-50 - offArm * 0.5));

  const line = (a, b, weight) => stroke(surface, a[0], a[1], b[0], b[1], s(weight), INK);

  line(at(0, 0), frontFoot, 5.5);
  line(at(0, 0), backFoot, 5.5);
  line(at(0, 0), shoulder, 6.5);
  line(shoulder, offHand, 4.5);
  line(shoulder, hand, 4.5);
  fillDisc(surface, head[0], head[1], s(14), INK);

  // The blade, and the guard square across it.
  const bladeAngle = spin + swordAngle * facing + (facing < 0 ? Math.PI : 0);
  const tip = [hand[0] + Math.cos(bladeAngle) * s(92), hand[1] + Math.sin(bladeAngle) * s(92)];
  stroke(surface, hand[0], hand[1], tip[0], tip[1], s(3.2), INK);
  const guard = [-Math.sin(bladeAngle) * s(9), Math.cos(bladeAngle) * s(9)];
  stroke(
    surface,
    hand[0] - guard[0],
    hand[1] - guard[1],
    hand[0] + guard[0],
    hand[1] + guard[1],
    s(3.2),
    INK,
  );

  // A headband, streaming behind. The only thing on either figure that is not
  // structural, and the only thing that says which way they are travelling.
  const tail = at(s(-facing * (16 + scarf * 20)), s(-70 - scarf * 6));
  const tailEnd = at(s(-facing * (30 + scarf * 40)), s(-62 - scarf * 14));
  stroke(surface, head[0], head[1], tail[0], tail[1], s(3), INK * 0.9);
  stroke(surface, tail[0], tail[1], tailEnd[0], tailEnd[1], s(2.4), INK * 0.75);

  return { hand, tip, head, shoulder, hipX, hipY };
}

/* ── aura ────────────────────────────────────────────────────────────────── */

/**
 * Aura leaving one figure and arriving at the other.
 *
 * Five discs on an arc, staggered. They are the only thing in the loop that
 * carries meaning: whatever the fight looked like, the count that leaves is the
 * count that lands. Nothing is created on the way across.
 */
function drawTransfer(surface, progress, fromX, toX) {
  if (progress <= 0) return;

  for (let orb = 0; orb < 5; orb += 1) {
    const t = clamp01((progress - orb * 0.1) / 0.6);
    if (t <= 0) continue;

    const eased = easeInOut(t);
    const x = lerp(fromX, toX, eased);
    const y = lerp(GROUND - 108, GROUND - 132, eased) - Math.sin(eased * Math.PI) * (58 + orb * 7);
    const radius = 7 + 3 * Math.sin(eased * Math.PI);

    fillDisc(surface, x, y, radius, INK * (0.3 + 0.7 * Math.min(1, t * 3)));
  }
}

/* ── choreography ────────────────────────────────────────────────────────── */

/**
 * The fight, beat by beat. Forty-eight frames at sixteen a second.
 *
 *   0–5    standoff at opposite ends, blades low
 *   6–11   both dash in, headbands streaming
 *   12–15  first clash, dead centre
 *   16–23  a flurry — four strikes, alternating, each with the arc it cut
 *   24–31  one somersaults clean over the other, cutting downward
 *   32–37  the other is caught and driven the length of the stage
 *   38–43  five units of aura cross the gap
 *   44–47  both dash back to their corners, and it begins again
 *
 * Staging is left to right and never doubles back: the leaper takes off on the
 * left, lands on the right, and the figure it beat is driven the other way. No
 * two bodies ever occupy the same stretch of floor.
 */
export function drawDuelFrame(index) {
  const surface = createSurface(FRAME_WIDTH, FRAME_HEIGHT, PAPER);

  // The floor. The only straight line in the picture.
  stroke(surface, 30, GROUND, FRAME_WIDTH - 30, GROUND, 2, INK * 0.3);

  const HOME_L = 140;
  const HOME_R = FRAME_WIDTH - 140;
  const BIND_L = CENTRE - 74;
  const BIND_R = CENTRE + 74;
  /** Where the leaper comes down, well clear of the figure it went over. */
  const LANDING = CENTRE + 190;
  /** Where the beaten one ends up, driven the other way. */
  const DRIVEN = CENTRE - 240;

  const left = { x: HOME_L, facing: 1, swordAngle: -0.55 };
  const right = { x: HOME_R, facing: -1, swordAngle: -0.55 };
  let clashAt = null;
  let clashStrength = 0;
  let transfer = 0;
  const arcs = [];

  if (index < 6) {
    // Standoff. Almost nothing moves; a breath in and out at the knees.
    const p = index / 6;
    const breathe = Math.sin(p * Math.PI * 2) * 3;
    left.crouch = 12 + breathe;
    right.crouch = 12 - breathe;
    left.swordAngle = 0.3;
    right.swordAngle = 0.3;
    left.offArm = 6;
    right.offArm = 6;
  } else if (index < 12) {
    // The dash. Both cover most of the stage, low and fast.
    const p = easeIn((index - 6) / 6);
    left.x = lerp(HOME_L, BIND_L, p);
    right.x = lerp(HOME_R, BIND_R, p);
    left.crouch = 18;
    right.crouch = 18;
    left.lean = 14;
    right.lean = 14;
    left.stride = 18 * p;
    right.stride = 18 * p;
    left.swordAngle = lerp(0.3, -0.2, p);
    right.swordAngle = lerp(0.3, -0.2, p);
    left.scarf = p;
    right.scarf = p;
    left.speed = p;
    right.speed = p;
  } else if (index < 16) {
    // First contact, dead centre, blades locked high.
    const p = (index - 12) / 4;
    const recoil = spike(p) * 12;
    left.x = BIND_L - recoil;
    right.x = BIND_R + recoil;
    left.crouch = 14;
    right.crouch = 14;
    left.lean = 10;
    right.lean = 10;
    left.reach = 22;
    right.reach = 22;
    left.swordAngle = -0.95;
    right.swordAngle = -0.95;
    left.scarf = 0.7;
    right.scarf = 0.7;
    clashAt = [CENTRE, GROUND - 132];
    clashStrength = 1 - p * 0.55;
  } else if (index < 24) {
    // The flurry. Four strikes, alternating, each with the arc it cut.
    const beat = index - 16;
    const attackerIsLeft = beat % 2 === 0;
    const attacker = attackerIsLeft ? left : right;
    const defender = attackerIsLeft ? right : left;
    const swing = ((beat >> 1) + 1) / 5;

    attacker.x = attackerIsLeft ? BIND_L + 8 : BIND_R - 8;
    defender.x = attackerIsLeft ? BIND_R + 14 : BIND_L - 14;
    attacker.reach = 30;
    attacker.lean = 18;
    attacker.crouch = 8;
    attacker.swordAngle = lerp(-1.5, 0.45, swing);
    attacker.scarf = 0.8;
    defender.reach = 6;
    defender.lean = -6;
    defender.crouch = 20;
    defender.swordAngle = -1.35;
    defender.scarf = 0.35;

    arcs.push({
      cx: attacker.x + (attackerIsLeft ? 92 : -92),
      cy: GROUND - 108,
      radius: 60,
      from: attackerIsLeft ? -2.3 : -0.85,
      to: attackerIsLeft ? -0.35 : -2.75,
      weight: 8,
      strength: 0.9,
    });

    clashAt = [CENTRE + (attackerIsLeft ? 26 : -26), GROUND - 116];
    clashStrength = 0.55 + 0.45 * spike(swing);
  } else if (index < 32) {
    // The somersault. One clears the other entirely, cutting on the way down.
    const p = (index - 24) / 8;

    left.x = lerp(BIND_L + 8, LANDING, easeInOut(p));
    // Sine on p rather than on the eased travel, so the take-off is immediate.
    // Capped so the head stays inside the frame at the top of the arc.
    left.lift = Math.sin(p * Math.PI) * 112;
    left.spin = -p * Math.PI * 2;
    // Tucked: a somersault reads as a somersault only if the limbs come in.
    left.crouch = 26;
    left.stride = -12;
    left.reach = -6;
    left.swordAngle = lerp(-1.1, 0.9, p);
    left.scarf = 1;
    left.speed = 0.75;

    right.x = BIND_R + 14;
    // Ducking hard: the pair only read as one-over-the-other if the one
    // underneath gets out of the way.
    right.crouch = lerp(16, 38, p);
    right.lean = lerp(-4, -24, p);
    right.swordAngle = lerp(-1.35, -2.05, p);
    right.offArm = 16 * p;
    right.scarf = 0.4;

    // The downward cut, on the way out of the flip.
    if (p > 0.55) {
      const cut = (p - 0.55) / 0.45;
      arcs.push({
        cx: lerp(BIND_R + 50, LANDING - 40, cut),
        cy: GROUND - 168 + cut * 96,
        radius: 78,
        from: -2.7,
        to: -0.5,
        weight: 10,
        strength: cut,
      });
    }
  } else if (index < 38) {
    // Caught, and driven the length of the stage — the other way.
    const p = easeOut((index - 32) / 6);

    left.x = LANDING;
    left.facing = -1;
    left.crouch = lerp(26, 8, p);
    left.lean = lerp(16, 8, p);
    left.reach = lerp(34, 22, p);
    left.swordAngle = lerp(0.9, -0.25, p);
    left.scarf = 0.5;

    right.x = lerp(CENTRE + 20, DRIVEN, p);
    right.facing = -1;
    right.spin = lerp(0, -0.6, p);
    right.crouch = lerp(32, 36, p);
    right.lean = lerp(-20, -36, p);
    right.swordAngle = lerp(-2.05, -2.55, p);
    right.offArm = 18;
    right.scarf = 0.9;
    right.speed = 1 - p * 0.4;
    right.speedDirection = 1;

    if (p < 0.5) {
      clashAt = [lerp(CENTRE + 40, CENTRE - 40, p), GROUND - 150];
      clashStrength = 1 - p * 2;
    }
  } else if (index < 44) {
    // Settlement. One stands taller by exactly what the other loses.
    const p = (index - 38) / 6;
    transfer = p;

    left.x = LANDING;
    left.facing = -1;
    left.crouch = 6;
    left.swordAngle = lerp(-0.25, 0.4, p);
    left.stature = easeOut(p) * 10;
    left.offArm = 4;

    right.x = DRIVEN;
    right.facing = -1;
    right.spin = -0.6;
    right.crouch = 36;
    right.lean = -36;
    right.swordAngle = -2.55;
    right.offArm = 18;
    right.stature = -easeOut(p) * 10;
  } else {
    // Back to their corners at speed, and around again.
    const p = easeInOut((index - 44) / 4);
    left.x = lerp(LANDING, HOME_L, p);
    left.facing = 1;
    left.crouch = lerp(6, 12, p);
    left.lean = 12 * (1 - p);
    left.swordAngle = lerp(0.4, 0.3, p);
    left.stature = lerp(10, 0, p);
    left.scarf = 1 - p;
    left.speed = 1 - p;
    left.speedDirection = 1;

    right.x = lerp(DRIVEN, HOME_R, p);
    right.facing = -1;
    right.spin = lerp(-0.6, 0, p);
    right.crouch = lerp(36, 12, p);
    right.lean = lerp(-36, 0, p);
    right.swordAngle = lerp(-2.55, 0.3, p);
    right.offArm = lerp(18, 6, p);
    right.stature = lerp(-10, 0, p);
    right.scarf = 1 - p;
    right.speed = 1 - p;
    right.speedDirection = -1;
  }

  // Marks go down before the figures, so nothing is drawn over a body.
  for (const arc of arcs) {
    swoosh(surface, arc.cx, arc.cy, arc.radius, arc.from, arc.to, arc.weight, arc.strength);
  }
  for (const who of [left, right]) {
    if (who.speed) {
      speedLines(
        surface,
        who.x,
        GROUND - HIP_HEIGHT - (who.lift ?? 0),
        who.speedDirection ?? who.facing,
        who.speed,
      );
    }
  }

  drawNinja(surface, left);
  drawNinja(surface, right);

  if (clashAt) impact(surface, clashAt[0], clashAt[1], clashStrength);
  drawHitWords(surface, index);
  // Left to right: the beaten figure is on the left by now, the winner on the right.
  drawTransfer(surface, transfer, DRIVEN + 30, LANDING - 30);

  return surface;
}

export const DUEL_GEOMETRY = { FRAME_WIDTH, FRAME_HEIGHT, COLUMNS, ROWS, FRAME_COUNT };
