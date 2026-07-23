"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ShadeData } from "@/types";
import { calculateMatchScore, type MatchResult } from "@/lib/matchScoring";
import { Sparkles, X } from "lucide-react";

interface Props {
  selectedShade: ShadeData | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
}

// SVG circular gauge ─────────────────────────────────────────────────────────
function ScoreRing({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  const R = 44;
  const circumference = 2 * Math.PI * R;
  const filled = circumference * (score / 10);
  const gap = circumference - filled;

  return (
    <svg width="108" height="108" className="match-ring-svg">
      {/* Track */}
      <circle
        cx="54" cy="54" r={R}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="8"
      />
      {/* Score arc */}
      <circle
        cx="54" cy="54" r={R}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={circumference * 0.25} /* start at top */
        className="match-ring-arc"
      />
      {/* Score text */}
      <text
        x="54" y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        className="match-ring-score-text"
        fill="white"
      >
        {score.toFixed(1)}
      </text>
      <text
        x="54" y="67"
        textAnchor="middle"
        className="match-ring-outof"
        fill="rgba(255,255,255,0.45)"
      >
        out of 10
      </text>
    </svg>
  );
}

// Mini bar ───────────────────────────────────────────────────────────────────
function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="match-bar-row">
      <span className="match-bar-label">{label}</span>
      <div className="match-bar-track">
        <div
          className="match-bar-fill"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
      <span className="match-bar-value">{value}/10</span>
    </div>
  );
}

// Main component ─────────────────────────────────────────────────────────────
export default function MatchRating({ selectedShade, canvasRef, className }: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const prevShadeId = useRef<string | null>(null);

  const runAnalysis = useCallback(() => {
    if (!selectedShade) return;
    setLoading(true);
    setResult(null);

    // Small delay so the UI feels like it's "thinking"
    setTimeout(() => {
      const score = calculateMatchScore(selectedShade, canvasRef.current ?? null);
      setResult(score);
      setLoading(false);
    }, 900);
  }, [selectedShade, canvasRef]);

  // Re-analyse when the shade changes while panel is open
  useEffect(() => {
    if (!active || !selectedShade) return;
    if (selectedShade.shadeId === prevShadeId.current) return;
    prevShadeId.current = selectedShade.shadeId;
    runAnalysis();
  }, [active, selectedShade, runAnalysis]);

  const handleToggle = () => {
    if (!active) {
      setActive(true);
      if (selectedShade) {
        prevShadeId.current = selectedShade.shadeId;
        runAnalysis();
      }
    } else {
      setActive(false);
      setResult(null);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className={`tryon-ctrl-btn match-rating-btn ${active ? "tryon-ctrl-btn--active match-btn-active" : ""} ${className ?? ""}`}
        onClick={handleToggle}
        aria-label="Toggle match rating"
        id="match-rating-toggle"
        title="Match Rating"
      >
        <Sparkles size={18} />
      </button>

      {/* Rating overlay card */}
      {active && (
        <div className="match-rating-card" role="region" aria-label="Match rating panel">
          {/* Header */}
          <div className="match-card-header">
            <Sparkles size={14} className="match-card-icon" />
            <span className="match-card-title">Shade Match Rating</span>
            <button
              className="match-card-close"
              onClick={() => { setActive(false); setResult(null); }}
              aria-label="Close match rating"
              id="match-card-close-btn"
            >
              <X size={13} />
            </button>
          </div>

          {/* No shade selected */}
          {!selectedShade && (
            <p className="match-card-empty">Select a shade to see your match rating.</p>
          )}

          {/* Analysing */}
          {selectedShade && loading && (
            <div className="match-card-loading">
              <div className="match-spinner" />
              <span>Analysing shade…</span>
            </div>
          )}

          {/* Result */}
          {selectedShade && !loading && result && (
            <div className="match-card-body">
              {/* Shade name */}
              <div className="match-shade-row">
                <div
                  className="match-shade-dot"
                  style={{ background: selectedShade.hexColor }}
                />
                <span className="match-shade-name">{selectedShade.name}</span>
              </div>

              {/* Ring gauge */}
              <div className="match-ring-wrap">
                <ScoreRing score={result.total} color={result.color} />
              </div>

              {/* Label */}
              <div
                className="match-label-pill"
                style={{ color: result.color, borderColor: result.color + "44", background: result.color + "18" }}
              >
                {result.label}
              </div>

              {/* Breakdown bars */}
              <div className="match-bars">
                <ScoreBar label="Undertone"    value={result.breakdown.undertone}   color={result.color} />
                <ScoreBar label="Color Family" value={result.breakdown.colorFamily} color={result.color} />
                <ScoreBar label="Finish"       value={result.breakdown.finish}      color={result.color} />
              </div>

              {/* Insight */}
              <p className="match-insight">{result.insight}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
