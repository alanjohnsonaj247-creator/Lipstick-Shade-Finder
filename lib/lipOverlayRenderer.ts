/**
 * lipOverlayRenderer.ts
 *
 * Pure 2D Canvas lip colour overlay — replaces the broken WebGL+2D hybrid.
 * Strategy:
 *  1. Draw the raw video frame to the canvas on every frame.
 *  2. If landmarks + shade exist, clip to the lip polygon and fill with colour.
 *  3. Use globalCompositeOperation = "multiply" for a natural pigment-on-skin look.
 *  4. Add a radial gloss highlight for glossy/satin finishes.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { ShadeData } from "@/types";
import { OUTER_LIP_INDICES, INNER_LIP_INDICES } from "./faceTracking";

export class LipOverlayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor({ canvas }: { canvas: HTMLCanvasElement }) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context not available");
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resizeToVideo(video: HTMLVideoElement) {
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  render(
    video: HTMLVideoElement,
    landmarks: NormalizedLandmark[] | null,
    shade: ShadeData | null,
    opacity: number = 0.75
  ) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // ── 1. Draw video frame ──────────────────────────────────────────
    ctx.drawImage(video, 0, 0, w, h);

    // ── 2. No shade → just show camera ───────────────────────────────
    if (!shade) return;

    // ── 3. Resolve finish parameters ──────────────────────────────────
    let baseOpacity = opacity;
    let glossAmount = 0;

    switch (shade.finish) {
      case "matte":
        baseOpacity = opacity * 0.88;
        glossAmount = 0;
        break;
      case "satin":
        baseOpacity = opacity * 0.78;
        glossAmount = 0.22;
        break;
      case "glossy":
        baseOpacity = opacity * 0.70;
        glossAmount = 0.55;
        break;
      case "sheer":
        baseOpacity = opacity * 0.42;
        glossAmount = 0.30;
        break;
      default:
        baseOpacity = opacity * 0.80;
        glossAmount = 0.10;
    }

    // ── 4. Build pixel coordinate arrays ────────────────────────────
    const toXY = (i: number): [number, number] => [
      landmarks?.[i]?.x ? landmarks[i].x * w : w * 0.5,
      landmarks?.[i]?.y ? landmarks[i].y * h : h * 0.57,
    ];

    const outer = OUTER_LIP_INDICES.map(toXY);
    const inner = INNER_LIP_INDICES.map(toXY);

    // ── 5. Draw lip colour with multiply blend ───────────────────────
    ctx.save();

    // Clip to outer lip shape only
    ctx.beginPath();
    this.smoothPath(ctx, outer);
    ctx.closePath();

    // Subtract inner lip (open mouth / teeth area)
    this.smoothPath(ctx, inner);
    ctx.closePath();

    ctx.clip("evenodd");

    // Fill with base colour using multiply for skin-tone integration
    const [r, g, b] = this.hexToRgb(shade.hexColor);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = baseOpacity;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);

    // Overlay tint pass (source-over) to boost vibrancy on darker skin tones
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = baseOpacity * 0.35;
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();

    // ── 6. Gloss highlight ────────────────────────────────────────────
    if (glossAmount > 0.05) {
      ctx.save();

      ctx.beginPath();
      this.smoothPath(ctx, outer);
      ctx.closePath();
      this.smoothPath(ctx, inner);
      ctx.closePath();
      ctx.clip("evenodd");

      // Centre of upper lip bow
      const cx = outer.reduce((s, [x]) => s + x, 0) / outer.length;
      const cy = outer.reduce((s, [, y]) => s + y, 0) / outer.length - (h * 0.008);
      const rx = Math.max(...outer.map(([x]) => Math.abs(x - cx)));
      const ry = Math.max(...outer.map(([, y]) => Math.abs(y - cy)));
      const radius = Math.max(rx, ry) * 0.7;

      const glrd = ctx.createRadialGradient(cx, cy - radius * 0.2, 0, cx, cy, radius);
      glrd.addColorStop(0, `rgba(255,255,255,${glossAmount * 0.85})`);
      glrd.addColorStop(0.45, `rgba(255,255,255,${glossAmount * 0.30})`);
      glrd.addColorStop(1, "rgba(255,255,255,0)");

      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 1;
      ctx.fillStyle = glrd;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    }

    // ── 7. Soft edge feathering (blur the border) ─────────────────────
    // Draw a slightly expanded semi-transparent outer ring to soften edges
    ctx.save();
    ctx.beginPath();
    this.smoothPath(ctx, outer);
    ctx.closePath();
    this.smoothPath(ctx, inner);
    ctx.closePath();

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 0.0; // Edge softening only
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  /** Draw a smooth bezier path through points */
  private smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
    if (pts.length < 2) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }

  dispose() {
    // No GPU resources to release in 2D mode
  }
}
