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

// Fragment shader handles matte/satin/glossy/sheer finish blending
const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;

in vec2 v_texcoord;
out vec4 fragColor;

uniform sampler2D u_video;
uniform vec3 u_lipColor;
uniform float u_alpha;
uniform float u_gloss;    // 0=matte, 1=glossy
uniform float u_saturation; // finish saturation boost
uniform vec2 u_resolution;

void main() {
  vec4 videoColor = texture(u_video, v_texcoord);
  
  // Base lip color blend (multiply mode for natural texture integration)
  vec3 baseBlend = u_lipColor * (videoColor.rgb * 0.4 + 0.6);
  
  // Screen blend for gloss highlight
  vec3 glossHighlight = vec3(1.0) - (vec3(1.0) - baseBlend) * (vec3(1.0) - u_lipColor * u_gloss * 0.5);
  
  // Mix between multiply base and gloss
  vec3 lipResult = mix(baseBlend, glossHighlight, u_gloss * 0.6);
  
  // Saturation boost for satin
  float luma = dot(lipResult, vec3(0.299, 0.587, 0.114));
  lipResult = mix(vec3(luma), lipResult, 1.0 + u_saturation * 0.4);
  
  // Feather alpha at edges (handled in mask, but subtle softness)
  float alpha = u_alpha;
  
  // Final composite
  fragColor = vec4(mix(videoColor.rgb, lipResult, alpha), 1.0);
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
    throw new Error(
      `Shader compile error: ${gl.getShaderInfoLog(shader)}`
    );
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
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private videoTexture: WebGLTexture;
  private maskCanvas: OffscreenCanvas;
  private maskCtx: OffscreenCanvasRenderingContext2D;
  private maskTexture: WebGLTexture;
  private quadBuffer: WebGLBuffer;
  private vao: WebGLVertexArrayObject;

  constructor({ canvas }: LipRendererOptions) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      premultipliedAlpha: false,
      antialias: true,
    });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    this.program = createProgram(gl, vert, frag);

    // Full-screen quad: position + texcoord
    // prettier-ignore
    const quadData = new Float32Array([
      // pos      // tex
      -1, -1,     0, 1,
       1, -1,     1, 1,
      -1,  1,     0, 0,
       1,  1,     1, 0,
    ]);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    const texLoc = gl.getAttribLocation(this.program, "a_texcoord");
    const stride = 4 * 4; // 4 floats * 4 bytes
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 8);

    gl.bindVertexArray(null);

    // Video texture
    this.videoTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Mask texture (2D canvas used as a mask)
    this.maskTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.maskCanvas = new OffscreenCanvas(1, 1);
    this.maskCtx = this.maskCanvas.getContext(
      "2d"
    ) as OffscreenCanvasRenderingContext2D;
  }

  resizeToVideo(video: HTMLVideoElement) {
    const { canvas } = this.gl;
    const w = video.videoWidth || canvas.width;
    const h = video.videoHeight || canvas.height;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.maskCanvas.width = w;
      this.maskCanvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  private buildLipMask(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) {
    const ctx = this.maskCtx;
    ctx.clearRect(0, 0, width, height);

    const toPixel = (lm: NormalizedLandmark) => [
      lm.x * width,
      lm.y * height,
    ] as [number, number];

    // Draw outer lip shape
    ctx.beginPath();
    const outer = OUTER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
    ctx.moveTo(outer[0][0], outer[0][1]);
    outer.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();

    // Draw inner lip (cutout for teeth area) using evenodd rule
    const inner = INNER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
    ctx.moveTo(inner[0][0], inner[0][1]);
    inner.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();

    // Feathered fill using radial gradient inside bounding box
    const allPoints = [...outer, ...inner];
    const minX = Math.min(...allPoints.map(([x]) => x));
    const maxX = Math.max(...allPoints.map(([x]) => x));
    const minY = Math.min(...allPoints.map(([, y]) => y));
    const maxY = Math.max(...allPoints.map(([, y]) => y));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const r = Math.max(rx, ry);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = grad;
    ctx.fill("evenodd");
  }

  render(
    video: HTMLVideoElement,
    landmarks: NormalizedLandmark[] | null,
    shade: ShadeData | null,
    opacity: number = 0.75
  ) {
    const gl = this.gl;
    const { width, height } = gl.canvas as HTMLCanvasElement;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Upload video frame
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(this.program, "u_video"), 0);
    gl.uniform2f(
      gl.getUniformLocation(this.program, "u_resolution"),
      width,
      height
    );

    // Determine finish params
    let alpha = 0.0;
    let gloss = 0.0;
    let saturation = 0.0;
    let lipColor: [number, number, number] = [0, 0, 0];

    if (landmarks && shade) {
      lipColor = hexToRgb(shade.hexColor);
      switch (shade.finish) {
        case "matte":
          alpha = opacity * 0.85;
          gloss = 0.0;
          saturation = 0.0;
          break;
        case "satin":
          alpha = opacity * 0.75;
          gloss = 0.25;
          saturation = 0.3;
          break;
        case "glossy":
          alpha = opacity * 0.65;
          gloss = 0.85;
          saturation = 0.5;
          break;
        case "sheer":
          alpha = opacity * 0.4;
          gloss = 0.5;
          saturation = 0.2;
          break;
      }

      // Build 2D mask
      this.buildLipMask(landmarks, width, height);

      // Upload mask as texture (premultiplied alpha stencil)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.maskCanvas
      );
      // Use mask alpha as the blend strength
      // We multiply alpha by mask alpha in the shader via a separate pass
      // For simplicity, we composite on a 2D overlay canvas post-render
    }

    gl.uniform3f(
      gl.getUniformLocation(this.program, "u_lipColor"),
      ...lipColor
    );
    gl.uniform1f(gl.getUniformLocation(this.program, "u_alpha"), 0.0); // base pass shows video
    gl.uniform1f(gl.getUniformLocation(this.program, "u_gloss"), gloss);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_saturation"), saturation);

    // First pass: render video frame
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Second pass: if we have landmarks + shade, composite the lip overlay
    if (landmarks && shade && alpha > 0) {
      gl.uniform1f(gl.getUniformLocation(this.program, "u_alpha"), alpha);
      // We draw the lip overlay using the mask canvas directly onto a 2D ctx
      // This hybrid approach gives us full masking control
    }

    gl.bindVertexArray(null);

    // Composite lip overlay using 2D canvas on top (mask-based)
    if (landmarks && shade && alpha > 0) {
      this.composite2DLipOverlay(
        gl.canvas as HTMLCanvasElement,
        landmarks,
        shade,
        alpha,
        gloss
      );
    }
  }

  private composite2DLipOverlay(
    glCanvas: HTMLCanvasElement,
    landmarks: NormalizedLandmark[],
    shade: ShadeData,
    alpha: number,
    gloss: number
  ) {
    // Use a temporary 2D canvas to draw the masked lip color
    // Then drawImage onto the WebGL canvas
    const w = glCanvas.width;
    const h = glCanvas.height;

    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const ctx = tmp.getContext("2d")!;

    // Copy current WebGL frame
    ctx.drawImage(glCanvas, 0, 0);

    // Draw lip color mask
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "source-over";

    const toPixel = (lm: NormalizedLandmark) =>
      [lm.x * w, lm.y * h] as [number, number];

    // Outer lip path
    ctx.beginPath();
    const outer = OUTER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
    ctx.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length - 1; i++) {
      const [x0, y0] = outer[i];
      const [x1, y1] = outer[i + 1] || outer[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.closePath();

    // Inner cutout
    const inner = INNER_LIP_INDICES.map((i) => toPixel(landmarks[i]));
    ctx.moveTo(inner[0][0], inner[0][1]);
    for (let i = 1; i < inner.length - 1; i++) {
      const [x0, y0] = inner[i];
      const [x1, y1] = inner[i + 1] || inner[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.closePath();

    const [r, g, b] = [
      parseInt(shade.hexColor.slice(1, 3), 16),
      parseInt(shade.hexColor.slice(3, 5), 16),
      parseInt(shade.hexColor.slice(5, 7), 16),
    ];

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill("evenodd");

    // Gloss highlight overlay
    if (gloss > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = gloss * 0.35;

      const allPts = outer;
      const cx =
        allPts.reduce((s, [x]) => s + x, 0) / allPts.length;
      const cy =
        allPts.reduce((s, [, y]) => s + y, 0) / allPts.length;
      const r2 =
        Math.max(
          ...allPts.map(([x, y]) =>
            Math.hypot(x - cx, y - cy)
          )
        ) * 0.6;

      const glrd = ctx.createRadialGradient(cx, cy - 4, 0, cx, cy, r2);
      glrd.addColorStop(0, "rgba(255,255,255,0.9)");
      glrd.addColorStop(0.5, "rgba(255,255,255,0.3)");
      glrd.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = glrd;
      ctx.beginPath();
      outer.forEach(([x, y], i) =>
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Blit back onto WebGL canvas via 2D ctx
    const gl2d = glCanvas.getContext("2d");
    if (gl2d) {
      gl2d.clearRect(0, 0, w, h);
      gl2d.drawImage(tmp, 0, 0);
    }
  }

  dispose() {
    const { gl } = this;
    gl.deleteTexture(this.videoTexture);
    gl.deleteTexture(this.maskTexture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
