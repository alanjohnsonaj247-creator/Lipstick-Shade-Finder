"use client";

import React from "react";
import type { ShadeData } from "@/types";
import { useShadeSelection } from "@/hooks/useShadeSelection";
import { X, ArrowLeftRight } from "lucide-react";
import clsx from "clsx";

interface CompareViewProps {
  onSelectCompareShade: (shade: ShadeData) => void;
}

export default function CompareView({ onSelectCompareShade }: CompareViewProps) {
  const { compareShades, removeFromCompare, clearCompare, selectedShade } =
    useShadeSelection();

  if (compareShades.length === 0) return null;

  return (
    <div className="compare-bar">
      <div className="compare-bar-inner">
        <div className="compare-bar-left">
          <ArrowLeftRight size={14} className="compare-icon" />
          <span className="compare-label">Compare</span>
        </div>

        <div className="compare-shades">
          {compareShades.map((shade) => (
            <button
              key={shade.shadeId}
              className={clsx("compare-shade-chip", {
                "compare-active": selectedShade?.shadeId === shade.shadeId,
              })}
              onClick={() => onSelectCompareShade(shade)}
              aria-label={`Preview ${shade.name}`}
              id={`compare-preview-${shade.shadeId}`}
            >
              <span
                className="compare-mini-swatch"
                style={{ backgroundColor: shade.hexColor }}
              />
              <span className="compare-shade-name">{shade.name}</span>
              <button
                className="compare-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCompare(shade.shadeId);
                }}
                aria-label={`Remove ${shade.name} from compare`}
              >
                <X size={10} />
              </button>
            </button>
          ))}
        </div>

        <button
          className="compare-clear-btn"
          onClick={clearCompare}
          aria-label="Clear compare list"
          id="clear-compare-btn"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
