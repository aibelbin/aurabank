"use client";

import { useEffect, useRef, useState } from "react";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./guilloche-shaders";
import { prefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { STORY_ATLAS } from "@/lib/story/atlas";
import { frameForProgress, scrubProgress, storyScale } from "@/lib/story/scrub";

const MAX_PIXEL_RATIO = 2;
const INK_OPACITY = 0.09;
/** Frame budget before the render resolution is stepped down. */
const SLOW_FRAME_MS = 22;
/** How quickly the displayed frame catches up to the scroll position. */
const SCRUB_EASING = 0.18;
/** Frame held when the reader prefers reduced motion: settlement, mid-act. */
const STILL_FRAME = 82;

const FRAME_ASPECT = STORY_ATLAS.frameWidth / STORY_ATLAS.frameHeight;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[guilloche] shader failed to compile", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[guilloche] program failed to link", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/**
 * Fixed, full-viewport engraving that sits behind the page.
 *
 * Two jobs: an ambient guilloché plate that never stops drifting, and the story
 * atlas engraved into it while the scrub section is on screen. Decoration only
 * — hidden from assistive technology, never interactive, and skipped entirely
 * where WebGL2 is unavailable, because the page is designed to read as plain
 * typography without it.
 */
export function GuillocheField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });

    if (!gl) {
      setUnsupported(true);
      return;
    }

    const program = buildProgram(gl);
    if (!program) {
      setUnsupported(true);
      return;
    }

    gl.useProgram(program);
    const uniforms = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      scroll: gl.getUniformLocation(program, "uScroll"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      opacity: gl.getUniformLocation(program, "uOpacity"),
      story: gl.getUniformLocation(program, "uStory"),
      storyGrid: gl.getUniformLocation(program, "uStoryGrid"),
      storyFrame: gl.getUniformLocation(program, "uStoryFrame"),
      storyStrength: gl.getUniformLocation(program, "uStoryStrength"),
      storyScale: gl.getUniformLocation(program, "uStoryScale"),
    };

    gl.uniform1i(uniforms.story, 0);
    gl.uniform2f(uniforms.storyGrid, STORY_ATLAS.columns, STORY_ATLAS.rows);

    // A 1x1 white texture stands in until the atlas arrives, so the first
    // frames render ambient-only instead of sampling undefined memory.
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      1,
      1,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let atlasReady = false;
    const atlas = new Image();
    atlas.decoding = "async";
    atlas.onload = () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Flip on upload so texture space runs bottom-up, matching the shader.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, atlas);
      atlasReady = true;
    };
    atlas.onerror = () => {
      // The page still works; it simply never shows the toon.
      console.error("[guilloche] story atlas failed to load");
    };
    atlas.src = STORY_ATLAS.src;

    const reduced = prefersReducedMotion();
    let resolutionScale = 1;
    let frame = 0;
    let running = true;
    let slowFrames = 0;
    let lastFrameTime = 0;
    let smoothedStoryFrame = reduced ? STILL_FRAME : 0;
    let scrubSection: HTMLElement | null = null;

    const pointer = { x: 0, y: 0 };
    const smoothedPointer = { x: 0, y: 0 };

    function findScrubSection() {
      scrubSection = document.querySelector<HTMLElement>("[data-story-scrub]");
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * resolutionScale;
      const width = Math.max(1, Math.floor(window.innerWidth * ratio));
      const height = Math.max(1, Math.floor(window.innerHeight * ratio));
      const [scaleX, scaleY] = storyScale(width, height, FRAME_ASPECT);
      gl!.uniform2f(uniforms.storyScale, scaleX, scaleY);

      if (canvas!.width === width && canvas!.height === height) return;
      canvas!.width = width;
      canvas!.height = height;
      gl!.viewport(0, 0, width, height);
    }

    /** Where the story is, and how strongly it should be engraved right now. */
    function readStory() {
      if (!atlasReady || !scrubSection) return { frame: smoothedStoryFrame, strength: 0 };

      const rect = scrubSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = scrubProgress(rect.top, rect.height, viewportHeight);

      // Cross-fade at both ends so the toon never appears over the hero or the
      // disclosure copy.
      const entering = Math.min(1, Math.max(0, 1 - rect.top / viewportHeight));
      const leaving = Math.min(1, Math.max(0, rect.bottom / viewportHeight));

      return {
        frame: frameForProgress(progress, STORY_ATLAS.frameCount),
        strength: Math.min(entering, leaving),
      };
    }

    function draw(elapsedMs: number) {
      const scroll = window.scrollY / Math.max(1, window.innerHeight);

      smoothedPointer.x += (pointer.x - smoothedPointer.x) * 0.05;
      smoothedPointer.y += (pointer.y - smoothedPointer.y) * 0.05;

      let strength = 0;
      if (reduced) {
        // Hold a single frame; the story is read from the captions instead.
        strength = atlasReady && scrubSection ? readStory().strength : 0;
        smoothedStoryFrame = STILL_FRAME;
      } else {
        const story = readStory();
        strength = story.strength;
        // Easing gives the scrub weight, like turning a heavy dial.
        smoothedStoryFrame += (story.frame - smoothedStoryFrame) * SCRUB_EASING;
      }

      gl!.uniform2f(uniforms.resolution, canvas!.width, canvas!.height);
      gl!.uniform1f(uniforms.time, elapsedMs / 1000);
      gl!.uniform1f(uniforms.scroll, scroll);
      gl!.uniform2f(uniforms.pointer, smoothedPointer.x, smoothedPointer.y);
      gl!.uniform1f(uniforms.opacity, INK_OPACITY);
      // The shader indexes atlas cells, so only whole frames make sense.
      gl!.uniform1f(uniforms.storyFrame, Math.round(smoothedStoryFrame));
      gl!.uniform1f(uniforms.storyStrength, strength);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function loop(now: number) {
      if (!running) return;

      // Step the resolution down rather than dropping the animation outright.
      if (lastFrameTime && resolutionScale > 0.5) {
        slowFrames = now - lastFrameTime > SLOW_FRAME_MS ? slowFrames + 1 : 0;
        if (slowFrames > 30) {
          resolutionScale = Math.max(0.5, resolutionScale - 0.25);
          slowFrames = 0;
          resize();
        }
      }
      lastFrameTime = now;

      draw(now);
      frame = requestAnimationFrame(loop);
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!reduced) {
        running = true;
        lastFrameTime = 0;
        frame = requestAnimationFrame(loop);
      }
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      running = false;
      cancelAnimationFrame(frame);
      setUnsupported(true);
    }

    findScrubSection();
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", onContextLost);

    if (reduced) {
      // No loop. One frame now, and one more whenever the atlas lands.
      draw(0);
      atlas.addEventListener("load", () => draw(0));
    } else {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      frame = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      atlas.onload = null;
      atlas.onerror = null;
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    };
  }, []);

  if (unsupported) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
