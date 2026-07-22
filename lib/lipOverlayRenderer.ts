/**
 * lipOverlayRenderer.ts
 *
 * Photorealistic lip colour overlay using a multi-pass 2D canvas approach.
 *
 * Realism strategy:
 *  1. Draw the raw video frame as the base.
 *  2. Create an offscreen canvas for the lip mask with edge-feathered blending.
 *  3. Use a skin-tone-aware multiply pass to let natural skin texture show through.
 *  4. Add an overlay/soft-light pass for pigment depth and warmth.
 *  5. Simulate natural lip lighting: darker at edges, lighter in center (3D form).
 *  6. Apply subtle edge feathering by drawing a blurred mask border.
 *  7. Add finish-specific effects: gloss highlights, matte flattening, sheer translucency.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { ShadeData } from "@/types";
import { OUTER_LIP_INDICES, INNER_LIP_INDICES } from "./faceTracking";

export class LipOverlayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // Offscreen canvases for multi-pass compositing
  private offscreen: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;

  constructor({ canvas }: { canvas: HTMLCanvasElement }) {
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
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
      // Rebuild offscreen canvas at new size
      this.offscreen = null;
      this.offCtx = null;
    }
    // Lazily create offscreen canvas
    if (!this.offscreen && typeof OffscreenCanvas !== "undefined") {
      try {
        this.offscreen = new OffscreenCanvas(w, h);
        this.offCtx = this.offscreen.getContext("2d", {
          alpha: true,
          willReadFrequently: false,
        }) as OffscreenCanvasRenderingContext2D;
      } catch {
        this.offscreen = null;
        this.offCtx = null;
      }
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

    // ── 1. Draw video frame ───────────────────────────────────────────
    ctx.drawImage(video, 0, 0, w, h);

    // ── 2. No shade or no landmarks → just show camera ────────────────
    if (!shade || !landmarks) return;

    // ── 3. Resolve finish parameters ──────────────────────────────────
    // Tuned for photorealism: lower opacity, better blend modes
    let multiplyOpacity: number;  // How much of the color to multiply-blend
    let overlayOpacity: number;   // Soft-light pass to add pigment depth
    let glossAmount: number;      // Gloss highlight strength
    let featherPx: number;        // Edge feather width in pixels

    switch (shade.finish) {
      case "matte":
        multiplyOpacity = opacity * 0.72;
        overlayOpacity  = opacity * 0.28;
        glossAmount     = 0;
        featherPx       = 2.5;
        break;
      case "satin":
        multiplyOpacity = opacity * 0.60;
        overlayOpacity  = opacity * 0.22;
        glossAmount     = 0.18;
        featherPx       = 2.0;
        break;
      case "glossy":
        multiplyOpacity = opacity * 0.48;
        overlayOpacity  = opacity * 0.16;
        glossAmount     = 0.52;
        featherPx       = 1.8;
        break;
      case "sheer":
        multiplyOpacity = opacity * 0.32;
        overlayOpacity  = opacity * 0.10;
        glossAmount     = 0.28;
        featherPx       = 2.0;
        break;
      default:
        multiplyOpacity = opacity * 0.62;
        overlayOpacity  = opacity * 0.22;
        glossAmount     = 0.08;
        featherPx       = 2.0;
    }

    // ── 4. Build pixel coordinate arrays ────────────────────────────
    const toXY = (i: number): [number, number] => [
      landmarks[i]?.x != null ? landmarks[i].x * w : w * 0.5,
      landmarks[i]?.y != null ? landmarks[i].y * h : h * 0.57,
    ];

    const outer = OUTER_LIP_INDICES.map(toXY);
    const inner = INNER_LIP_INDICES.map(toXY);

    // Compute bounding info for gradients
    const allPts = outer;
    const xs = allPts.map(([x]) => x);
    const ys = allPts.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const lipW = maxX - minX;
    const lipH = maxY - minY;

    const [r, g, b] = this.hexToRgb(shade.hexColor);

    // ── 5. Multi-pass compositing ────────────────────────────────────
    // We draw the lip color onto an offscreen transparent canvas,
    // then composite it onto the main canvas. This lets us control
    // the overall lip layer opacity cleanly.

    const offCtx = this.offCtx;
    const offscreen = this.offscreen;

    if (offCtx && offscreen) {
      // Clear offscreen
      offCtx.clearRect(0, 0, w, h);

      // ── Pass A: Base color multiply simulation
      // We draw the shade color, then it will be composited with multiply on main canvas
      this.clipToLips(offCtx, outer, inner);

      // Fill with the shade color (this is the "pigment" layer)
      offCtx.fillStyle = `rgba(${r},${g},${b},1)`;
      offCtx.fillRect(0, 0, w, h);

      // ── Pass B: Lip form shading — darker at edges, lighter mid-upper
      // This simulates the 3D curvature of lips
      const formGrad = offCtx.createRadialGradient(
        cx, cy - lipH * 0.1, lipH * 0.08,
        cx, cy,              lipH * 0.8
      );
      formGrad.addColorStop(0,   "rgba(255,255,255,0.12)"); // slight center brightening
      formGrad.addColorStop(0.5, "rgba(0,0,0,0)");
      formGrad.addColorStop(1,   "rgba(0,0,0,0.22)");       // edge darkening for depth

      offCtx.globalCompositeOperation = "source-over";
      offCtx.globalAlpha = 1;
      offCtx.fillStyle = formGrad;
      offCtx.fillRect(0, 0, w, h);

      // ── Pass C: Upper lip center highlight (Cupid's bow warmth)
      const upperCy = minY + lipH * 0.25;
      const bowGrad = offCtx.createRadialGradient(cx, upperCy, 0, cx, upperCy, lipW * 0.35);
      bowGrad.addColorStop(0,   `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 15)},${Math.min(255, b + 10)},0.18)`);
      bowGrad.addColorStop(1,   "rgba(0,0,0,0)");
      offCtx.fillStyle = bowGrad;
      offCtx.fillRect(0, 0, w, h);

      // ── Pass D: Edge feathering on offscreen canvas ─────────────────
      // Use destination-out on the offscreen (alpha:true) canvas so the
      // lip boundary fades to transparent instead of black.
      offCtx.globalCompositeOperation = "destination-out";
      offCtx.globalAlpha = 0.65;
      offCtx.strokeStyle = "rgba(0,0,0,1)";
      offCtx.lineWidth = featherPx * 2.5;
      offCtx.lineJoin = "round";
      offCtx.lineCap = "round";

      // Feather outer lip boundary
      offCtx.beginPath();
      this.smoothPath(offCtx, outer);
      offCtx.closePath();
      offCtx.stroke();

      // Feather inner lip boundary
      offCtx.globalAlpha = 0.40;
      offCtx.lineWidth = featherPx * 1.2;
      offCtx.beginPath();
      this.smoothPath(offCtx, inner);
      offCtx.closePath();
      offCtx.stroke();

      offCtx.restore();

      // ── Now composite the lip layer onto the main canvas ────────────
      // Step 1: Multiply pass (lets skin texture show through the color)
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = multiplyOpacity;
      ctx.drawImage(offscreen, 0, 0);

      // Step 2: Soft-light pass (adds pigment richness without going opaque)
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(offscreen, 0, 0);

      ctx.restore();

    } else {
      // Fallback if OffscreenCanvas not available
      this.renderFallback(ctx, outer, inner, r, g, b, multiplyOpacity, w, h);
    }

    // ── 7. Gloss highlight ────────────────────────────────────────────
    if (glossAmount > 0.04) {
      this.drawGlossHighlight(ctx, outer, inner, cx, cy, lipW, lipH, glossAmount);
    }
  }

  /**
   * Clip a context to the lip region (outer minus inner = lip skin only).
   */
  private clipToLips(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    outer: [number, number][],
    inner: [number, number][]
  ) {
    ctx.save();
    ctx.beginPath();
    this.smoothPath(ctx, outer);
    ctx.closePath();
    this.smoothPath(ctx, inner);
    ctx.closePath();
    ctx.clip("evenodd");
  }


  /**
   * Physically-based gloss highlight that follows the lip curvature.
   * Upper lip: narrow specular near the center-top (Cupid's bow).
   * Lower lip: broader, oval highlight on the fuller center.
   */
  private drawGlossHighlight(
    ctx: CanvasRenderingContext2D,
    outer: [number, number][],
    inner: [number, number][],
    cx: number,
    cy: number,
    lipW: number,
    lipH: number,
    glossAmount: number
  ) {
    ctx.save();

    // Clip to lips
    ctx.beginPath();
    this.smoothPath(ctx, outer);
    ctx.closePath();
    this.smoothPath(ctx, inner);
    ctx.closePath();
    ctx.clip("evenodd");

    // ── Lower lip highlight (main, broader) ──────────────────────────
    const lowerCx = cx;
    const lowerCy = cy + lipH * 0.20; // slightly below center = lower lip
    const lowerRx = lipW * 0.28;
    const lowerRy = lipH * 0.18;

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 1;

    // Elliptical radial gradient for lower lip gloss
    ctx.save();
    ctx.translate(lowerCx, lowerCy);
    ctx.scale(1, lowerRy / lowerRx); // squish to ellipse
    const lowerGloss = ctx.createRadialGradient(0, 0, 0, 0, 0, lowerRx);
    lowerGloss.addColorStop(0,    `rgba(255,255,255,${glossAmount * 0.75})`);
    lowerGloss.addColorStop(0.5,  `rgba(255,255,255,${glossAmount * 0.30})`);
    lowerGloss.addColorStop(1,    "rgba(255,255,255,0)");
    ctx.fillStyle = lowerGloss;
    ctx.fillRect(-lowerRx * 3, -lowerRx * 3, lowerRx * 6, lowerRx * 6);
    ctx.restore();

    // ── Upper lip specular (smaller, sharper) ─────────────────────────
    const upperCx = cx;
    const upperCy = cy - lipH * 0.22;
    const upperR  = lipW * 0.14;

    ctx.save();
    ctx.translate(upperCx, upperCy);
    ctx.scale(1, 0.55); // flatter ellipse
    const upperGloss = ctx.createRadialGradient(0, 0, 0, 0, 0, upperR);
    upperGloss.addColorStop(0,   `rgba(255,255,255,${glossAmount * 0.45})`);
    upperGloss.addColorStop(0.6, `rgba(255,255,255,${glossAmount * 0.10})`);
    upperGloss.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = upperGloss;
    ctx.fillRect(-upperR * 3, -upperR * 3, upperR * 6, upperR * 6);
    ctx.restore();

    ctx.restore();
  }

  /** Fallback renderer when OffscreenCanvas is unavailable */
  private renderFallback(
    ctx: CanvasRenderingContext2D,
    outer: [number, number][],
    inner: [number, number][],
    r: number, g: number, b: number,
    opacity: number,
    w: number, h: number
  ) {
    ctx.save();
    ctx.beginPath();
    this.smoothPath(ctx, outer);
    ctx.closePath();
    this.smoothPath(ctx, inner);
    ctx.closePath();
    ctx.clip("evenodd");

    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = opacity;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = opacity * 0.4;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  /** Draw a smooth bezier path through points */
  private smoothPath(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    pts: [number, number][]
  ) {
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
    this.offscreen = null;
    this.offCtx = null;
  }
}
