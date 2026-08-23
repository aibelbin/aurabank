/**
 * Guilloché: the engraved interference pattern printed on banknotes and share
 * certificates. Generated from maths, with the story atlas engraved into it.
 */

export const VERTEX_SHADER = `#version 300 es
void main() {
  // A single fullscreen triangle derived from the vertex index.
  // No buffers, no attributes, no geometry to upload.
  vec2 corner = vec2(float((gl_VertexID & 1) << 2), float((gl_VertexID & 2) << 1));
  gl_Position = vec4(corner - 1.0, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform vec2 uPointer;
uniform float uOpacity;

uniform sampler2D uStory;
uniform vec2 uStoryGrid;      // columns, rows
uniform float uStoryFrame;    // index into the atlas
uniform float uStoryStrength; // 0 = no story on screen, 1 = full
uniform vec2 uStoryScale;     // screen space -> frame space, aspect preserved
uniform vec2 uStoryOffset;    // centred across, anchored to the bottom

out vec4 fragColor;

// One engraved plate: a sinusoid in polar space, petalled by the angle.
float rosette(vec2 p, float radialFrequency, float petals, float phase) {
  float radius = length(p);
  float angle = atan(p.y, p.x);
  return sin(radius * radialFrequency + sin(angle * petals + phase) * 2.6 + phase);
}

// Ink coverage of the current story frame at this point. 1.0 is solid artwork.
float storyInk(vec2 uv) {
  vec2 p = uv * uStoryScale * 0.5 + uStoryOffset;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;

  float column = mod(uStoryFrame, uStoryGrid.x);
  float row = floor(uStoryFrame / uStoryGrid.x);
  vec2 cell = 1.0 / uStoryGrid;
  // The atlas is packed top-to-bottom; texture space runs bottom-to-top.
  vec2 origin = vec2(column, uStoryGrid.y - 1.0 - row) * cell;
  // Stay a hair inside the cell so filtering cannot bleed in the next frame.
  vec2 inset = clamp(p, 0.002, 0.998);
  return 1.0 - texture(uStory, origin + inset * cell).r;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  vec2 centred = uv - uPointer * 0.10;
  float t = uTime * 0.06 + uScroll * 1.6;

  float story = storyInk(uv) * uStoryStrength;
  float figure = smoothstep(0.38, 0.62, story);

  // Three plates superimposed, the way an engraver layers them.
  float field = 0.0;
  field += rosette(centred, 30.0, 5.0, t);
  field += rosette(centred * 1.28 + vec2(0.22, -0.14), 44.0, 7.0, -t * 0.8 + 1.7);
  field += rosette(centred * 0.76 + vec2(-0.18, 0.26), 21.0, 3.0, t * 1.25 + 3.1);

  // Inside the artwork a fourth, much finer plate is laid down. That density is
  // what makes the figure read as an engraved portrait rather than a silhouette.
  field += figure * rosette(centred * 2.3, 96.0, 11.0, t * 0.7) * 1.5;

  // Convert the interference field into hairlines of even weight. Dividing by
  // the screen-space derivative keeps every line one pixel wide regardless of
  // frequency, and fades lines out where they are too dense to resolve —
  // which is exactly how it avoids moiré.
  float wave = field * 0.5;
  float distanceToLine = abs(fract(wave) - 0.5);
  float derivative = length(vec2(dFdx(wave), dFdy(wave))) + 1e-5;
  float line = 1.0 - smoothstep(derivative, derivative * 2.0, distanceToLine);

  // Vignette so type always sits on clean paper.
  float vignette = 1.0 - smoothstep(0.55, 1.5, length(uv));

  float ambient = line * vignette * uOpacity;
  // The figure's own lines carry more weight, plus a faint wash so the shape
  // holds together at a glance.
  // Deliberately restrained: the captions explain the mechanic, so the artwork
  // is atmosphere and must never compete with the type in front of it.
  float engraved = line * figure * 0.38 + figure * 0.06;

  fragColor = vec4(vec3(0.04), clamp(ambient + engraved, 0.0, 1.0));
}`;
