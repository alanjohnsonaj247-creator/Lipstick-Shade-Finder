import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { ShadeData } from "@/types";
import {
  OUTER_LIP_INDICES,
  INNER_LIP_INDICES,
} from "./faceTracking";

export type FinishMode = "matte" | "satin" | "glossy" | "sheer";

interface LipRendererOptions {
  canvas: HTMLCanvasElement;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_texcoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;

in vec2 v_texcoord;
out vec4 fragColor;

uniform sampler2D u_video;
uniform sampler2D u_mask;
uniform vec3 u_lipColor;
uniform float u_alpha;
uniform float u_gloss;
uniform float u_saturation;

vec3 rgbToHsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;
  float d = maxC - minC;
  float s = 0.0;
  if (d > 1e-6) {
    s = d / (1.0 - abs(2.0 * l - 1.0));
  }

  float h = 0.0;
  if (d > 1e-6) {
    if (maxC == c.r) {
      h = mod((c.g - c.b) / d + 6.0, 6.0) / 6.0;
    } else if (maxC == c.g) {
      h = ((c.b - c.r) / d + 2.0) / 6.0;
    } else {
      h = ((c.r - c.g) / d + 4.0) / 6.0;
    }
  }

  return vec3(h, s, l);
}

float hueToChannel(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;

  return vec3(
    hueToChannel(p, q, h + 1.0 / 3.0),
    hueToChannel(p, q, h),
    hueToChannel(p, q, h - 1.0 / 3.0)
  );
}

void main() {
  vec4 videoColor = texture(u_video, v_texcoord);
  float maskAlpha = texture(u_mask, v_texcoord).a;

  if (maskAlpha <= 0.001) {
    fragColor = vec4(videoColor.rgb, 1.0);
    return;
  }

  vec3 videoHsl = rgbToHsl(videoColor.rgb);
  vec3 shadeHsl = rgbToHsl(u_lipColor);

  float sat = mix(videoHsl.y, shadeHsl.y, clamp(u_saturation, 0.0, 1.0));
  sat = clamp(sat, 0.0, 1.0);

  float lightness = mix(videoHsl.z, shadeHsl.z, 0.18);
  lightness = clamp(lightness, 0.0, 1.0);

  vec3 blended = hslToRgb(vec3(shadeHsl.x, sat, lightness));
  vec3 base = mix(videoColor.rgb, blended, clamp(u_alpha * maskAlpha, 0.0, 1.0));

  vec2 highlightCenter = vec2(0.58, 0.36);
  float highlight = smoothstep(0.0, 0.38, 1.0 - distance(v_texcoord, highlightCenter));
  vec3 highlightColor = mix(base, vec3(1.0, 0.97, 0.95), highlight * u_gloss * 0.22);
  vec3 finalColor = mix(base, highlightColor, 0.18 + u_gloss * 0.1);

  fragColor = vec4(finalColor, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

export class LipOverlayRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D | null;
  private maskTexture: WebGLTexture | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private ctx: CanvasRenderingContext2D | null;
  private useWebGL = false;
  private canvas: HTMLCanvasElement;

  constructor({ canvas }: LipRendererOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maskCanvas = document.createElement("canvas");
    this.maskCtx = this.maskCanvas.getContext("2d");

    try {
      const gl = canvas.getContext("webgl2", {
        alpha: false,
        premultipliedAlpha: false,
        antialias: true,
      });
      if (!gl) throw new Error("WebGL2 not supported");
      this.gl = gl;
      this.useWebGL = true;

      const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      this.program = createProgram(gl, vert, frag);

      const quadData = new Float32Array([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        1, 1, 1, 0,
      ]);

      this.vao = gl.createVertexArray()!;
      gl.bindVertexArray(this.vao);

      this.quadBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(this.program, "a_position");
      const texLoc = gl.getAttribLocation(this.program, "a_texcoord");
      const stride = 4 * 4;
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 8);

      gl.bindVertexArray(null);

      this.videoTexture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.maskTexture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (error) {
      console.warn("WebGL2 renderer unavailable, falling back to canvas renderer", error);
      this.useWebGL = false;
    }
  }

  resizeToVideo(video: HTMLVideoElement) {
    const canvas = this.canvas;
    const w = video.videoWidth || canvas.width;
    const h = video.videoHeight || canvas.height;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.maskCanvas.width = w;
      this.maskCanvas.height = h;
    }

    if (this.useWebGL && this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  }

  private drawSmoothPath(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null, pts: [number, number][]) {
    if (!ctx || !pts.length) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  private buildLipMask(
    landmarks: NormalizedLandmark[] | null,
    width: number,
    height: number
  ) {
    const ctx = this.maskCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.fillStyle = "white";

    const toPixel = (lm: NormalizedLandmark) => [lm.x * width, lm.y * height] as [number, number];

    const useInnerCutout = Boolean(
      landmarks && landmarks[13] && landmarks[14] && Math.abs(landmarks[13].y - landmarks[14].y) > 0.022
    );

    const outer = OUTER_LIP_INDICES.map((i) => toPixel(landmarks?.[i] ?? { x: 0.5, y: 0.57 } as NormalizedLandmark));
    const allPoints = [...outer];

    if (useInnerCutout) {
      const inner = INNER_LIP_INDICES.map((i) => toPixel(landmarks?.[i] ?? { x: 0.5, y: 0.57 } as NormalizedLandmark));
      allPoints.push(...inner);
    }

    const minX = Math.min(...allPoints.map(([x]) => x));
    const maxX = Math.max(...allPoints.map(([x]) => x));
    const minY = Math.min(...allPoints.map(([, y]) => y));
    const maxY = Math.max(...allPoints.map(([, y]) => y));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const r = Math.max(rx, ry) * 1.08;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.95)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    this.drawSmoothPath(ctx, outer);
    ctx.closePath();

    if (useInnerCutout) {
      const inner = INNER_LIP_INDICES.map((i) => toPixel(landmarks?.[i] ?? { x: 0.5, y: 0.57 } as NormalizedLandmark));
      ctx.beginPath();
      this.drawSmoothPath(ctx, inner);
      ctx.closePath();
      ctx.fill("evenodd");
    } else {
      ctx.fill();
    }
    ctx.restore();
  }

  private render2D(
    video: HTMLVideoElement,
    landmarks: NormalizedLandmark[] | null,
    shade: ShadeData | null,
    opacity: number
  ) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    if (!shade || !landmarks) return;

    const toPixel = (lm: NormalizedLandmark) => [lm.x * width, lm.y * height] as [number, number];
    const outer = OUTER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
    const useInnerCutout = Boolean(
      landmarks[13] && landmarks[14] && Math.abs(landmarks[13].y - landmarks[14].y) > 0.022
    );

    let alpha = opacity * 0.82;
    let gloss = 0.15;
    switch (shade.finish) {
      case "matte":
        alpha = opacity * 0.78;
        gloss = 0.08;
        break;
      case "satin":
        alpha = opacity * 0.84;
        gloss = 0.26;
        break;
      case "glossy":
        alpha = opacity * 0.92;
        gloss = 0.7;
        break;
      case "sheer":
        alpha = opacity * 0.45;
        gloss = 0.18;
        break;
    }

    const [r, g, b] = [
      parseInt(shade.hexColor.slice(1, 3), 16),
      parseInt(shade.hexColor.slice(3, 5), 16),
      parseInt(shade.hexColor.slice(5, 7), 16),
    ];

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    this.drawSmoothPath(ctx, outer);
    if (useInnerCutout) {
      const inner = INNER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
      ctx.beginPath();
      this.drawSmoothPath(ctx, inner);
      ctx.closePath();
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill("evenodd");
    } else {
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.closePath();
      ctx.fill();
    }

    if (gloss > 0.1) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = gloss * 0.45;
      const cx = outer.reduce((sum, [x]) => sum + x, 0) / outer.length;
      const cy = outer.reduce((sum, [, y]) => sum + y, 0) / outer.length;
      const radius = Math.max(...outer.map(([x, y]) => Math.hypot(x - cx, y - cy))) * 0.7;
      const highlight = ctx.createRadialGradient(cx, cy - 6, 0, cx, cy, radius);
      highlight.addColorStop(0, "rgba(255,255,255,0.95)");
      highlight.addColorStop(0.5, "rgba(255,255,255,0.25)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = highlight;
      ctx.beginPath();
      this.drawSmoothPath(ctx, outer);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  render(
    video: HTMLVideoElement,
    landmarks: NormalizedLandmark[] | null,
    shade: ShadeData | null,
    opacity: number = 0.75
  ) {
    if (!this.useWebGL || !this.gl || !this.program || !this.videoTexture || !this.maskTexture) {
      this.render2D(video, landmarks, shade, opacity);
      return;
    }

    const gl = this.gl;
    const { width, height } = this.canvas;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.uniform1i(gl.getUniformLocation(this.program, "u_video"), 0);

    let alpha = 0.0;
    let gloss = 0.0;
    let saturation = 0.0;
    let lipColor: [number, number, number] = [0, 0, 0];

    if (shade) {
      lipColor = hexToRgb(shade.hexColor);
      switch (shade.finish) {
        case "matte":
          alpha = opacity * 0.72;
          gloss = 0.08;
          saturation = 0.6;
          break;
        case "satin":
          alpha = opacity * 0.78;
          gloss = 0.28;
          saturation = 0.84;
          break;
        case "glossy":
          alpha = opacity * 0.9;
          gloss = 0.78;
          saturation = 0.95;
          break;
        case "sheer":
          alpha = opacity * 0.38;
          gloss = 0.2;
          saturation = 0.55;
          break;
        default:
          alpha = opacity * 0.8;
          gloss = 0.2;
          saturation = 0.75;
      }

      this.buildLipMask(landmarks, width, height);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.maskCanvas);
      gl.uniform1i(gl.getUniformLocation(this.program, "u_mask"), 1);
    }

    gl.uniform3f(gl.getUniformLocation(this.program, "u_lipColor"), ...lipColor);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_alpha"), alpha);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_gloss"), gloss);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_saturation"), saturation);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    gl.deleteTexture(this.videoTexture);
    gl.deleteTexture(this.maskTexture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
