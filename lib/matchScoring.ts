import type { ShadeData } from "@/types";

// ── Deterministic seeded score component (consistent per shade) ──────────────
function stableHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff; // 0–1
}

// ── Sample skin tone from the canvas (forehead area) ─────────────────────────
export function sampleSkinTone(
  canvas: HTMLCanvasElement
): { r: number; g: number; b: number } | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height * 0.18); // forehead region
    const half = 24;
    const d = ctx.getImageData(
      Math.max(0, cx - half),
      Math.max(0, cy - half),
      half * 2,
      half * 2
    ).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n === 0) return null;
    return { r: r / n, g: g / n, b: b / n };
  } catch {
    return null;
  }
}

export function inferUndertone(
  rgb: { r: number; g: number; b: number }
): "warm" | "cool" | "neutral" {
  const { r, g, b } = rgb;
  const warmDiff = r - b;
  if (warmDiff > 28) return "warm";
  if (warmDiff < -8) return "cool";
  return "neutral";
}

// ── Sub-scores (each 0–1) ─────────────────────────────────────────────────────

function undertoneScore(shade: ShadeData, skinUndertone: string): number {
  if (shade.undertone === skinUndertone) return 1.0;
  if (shade.undertone === "neutral" || skinUndertone === "neutral") return 0.72;
  return 0.38; // mismatch
}

function colorFamilyScore(shade: ShadeData, skinUndertone: string): number {
  const map: Record<string, Record<string, number>> = {
    reds:    { warm: 0.88, cool: 0.95, neutral: 0.90 },
    pinks:   { warm: 0.85, cool: 0.92, neutral: 0.90 },
    nudes:   { warm: 0.95, cool: 0.72, neutral: 0.88 },
    browns:  { warm: 0.95, cool: 0.68, neutral: 0.82 },
    berries: { warm: 0.72, cool: 0.95, neutral: 0.84 },
    purples: { warm: 0.65, cool: 0.97, neutral: 0.80 },
  };
  return map[shade.colorFamily]?.[skinUndertone] ?? 0.80;
}

function finishScore(shade: ShadeData): number {
  return { satin: 0.95, glossy: 0.88, sheer: 0.85, matte: 0.82 }[shade.finish] ?? 0.80;
}

function personalityBonus(shade: ShadeData): number {
  // Deterministic per-shade "uniqueness" bonus so scores feel varied
  return stableHash(shade.shadeId + "match") * 0.18;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MatchBreakdown {
  undertone: number;   // 0–10
  colorFamily: number; // 0–10
  finish: number;      // 0–10
}

export interface MatchResult {
  total: number;       // 1–10 (one decimal)
  label: string;
  color: string;       // hex for the ring
  breakdown: MatchBreakdown;
  insight: string;     // 1-line personalised tip
}

export function calculateMatchScore(
  shade: ShadeData,
  canvas: HTMLCanvasElement | null
): MatchResult {
  const skinRgb = canvas ? sampleSkinTone(canvas) : null;
  const skinUndertone = skinRgb ? inferUndertone(skinRgb) : "neutral";

  const uScore  = undertoneScore(shade, skinUndertone);
  const cfScore = colorFamilyScore(shade, skinUndertone);
  const fScore  = finishScore(shade);
  const bonus   = personalityBonus(shade);

  // Weighted average (undertone matters most)
  const raw = uScore * 0.40 + cfScore * 0.35 + fScore * 0.20 + bonus * 0.05;

  // Map to 4.0–10.0 range (never below 4 — every shade has something going for it)
  const total = Math.min(10, parseFloat((4 + raw * 6).toFixed(1)));

  const label =
    total >= 9   ? "Perfect Match 🌟" :
    total >= 7.5 ? "Excellent Match"  :
    total >= 6   ? "Great Match"      :
    total >= 4.5 ? "Good Match"       :
                   "Subtle Match";

  const color =
    total >= 9   ? "#f59e0b" :
    total >= 7.5 ? "#10b981" :
    total >= 6   ? "#3b82f6" :
    total >= 4.5 ? "#8b5cf6" :
                   "#6b7280";

  const undertoneLabels: Record<string, string> = {
    warm: "warm golden", cool: "cool rosy", neutral: "balanced neutral",
  };
  const insight = `${shade.name} suits your ${undertoneLabels[skinUndertone] ?? skinUndertone} skin — best worn ${shade.occasion[0] ?? "anytime"}.`;

  return {
    total,
    label,
    color,
    breakdown: {
      undertone:   Math.round(uScore  * 10),
      colorFamily: Math.round(cfScore * 10),
      finish:      Math.round(fScore  * 10),
    },
    insight,
  };
}
