"use client";

import React from "react";
import { Heart, Check } from "lucide-react";
import type { ShadeData } from "@/types";
import clsx from "clsx";

interface ShadeSwatchProps {
  shade: ShadeData;
  isSelected: boolean;
  isFavorited: boolean;
  isInCompare: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onAddToCompare: () => void;
}

export default function ShadeSwatch({
  shade,
  isSelected,
  isFavorited,
  isInCompare,
  onSelect,
  onToggleFavorite,
  onAddToCompare,
}: ShadeSwatchProps) {
  return (
    <div className="shade-swatch-wrapper" title={shade.name}>
      <button
        role="radio"
        aria-checked={isSelected}
        aria-label={`${shade.name} – ${shade.finish} ${shade.colorFamily} lipstick`}
        className={clsx("shade-swatch-btn", { "swatch-selected": isSelected })}
        onClick={onSelect}
        id={`swatch-${shade.shadeId}`}
        style={{ "--swatch-color": shade.hexColor } as React.CSSProperties}
      >
        <span
          className="swatch-circle"
          style={{ backgroundColor: shade.hexColor }}
        />
        {isSelected && (
          <span className="swatch-check">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
        {isInCompare && <span className="swatch-compare-dot" />}
      </button>

      {/* Favorite button */}
      <button
        aria-label={isFavorited ? `Remove ${shade.name} from favorites` : `Add ${shade.name} to favorites`}
        className={clsx("swatch-heart-btn", { "heart-active": isFavorited })}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        id={`favorite-${shade.shadeId}`}
      >
        <Heart size={10} fill={isFavorited ? "currentColor" : "none"} />
      </button>

      {/* Shade name — always visible */}
      <span className="swatch-label swatch-label-always">{shade.name}</span>

      {/* Finish indicator */}
      <span className="swatch-finish-badge swatch-finish-visible">{shade.finish}</span>

      {/* Right-click / long-press to add to compare */}
      <button
        className="swatch-compare-btn"
        aria-label={`Add ${shade.name} to compare`}
        onClick={(e) => {
          e.stopPropagation();
          onAddToCompare();
        }}
        title="Add to compare"
        id={`compare-${shade.shadeId}`}
      >
        +
      </button>
    </div>
  );
}
