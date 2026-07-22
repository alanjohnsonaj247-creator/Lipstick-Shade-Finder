"use client";

import React from "react";
import type { ShadeData } from "@/types";
import { Sparkles } from "lucide-react";

interface BrandMatchButtonProps {
  selectedShade: ShadeData | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function BrandMatchButton({
  selectedShade,
  isOpen,
  onToggle,
}: BrandMatchButtonProps) {
  if (!selectedShade) return null;

  return (
    <button
      type="button"
      className="brand-match-button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="brand-match-panel"
      aria-label="See this shade in other brands"
      id="brand-match-toggle"
    >
      <span
        className="brand-match-button-swatch"
        style={{ backgroundColor: selectedShade.hexColor }}
        aria-hidden="true"
      />
      <span className="brand-match-button-text">
        <span className="brand-match-button-label">See this shade in other brands</span>
        <span className="brand-match-button-subtext">
          Color-based matches across the catalog
        </span>
      </span>
      <Sparkles size={16} className="brand-match-button-icon" />
    </button>
  );
}
