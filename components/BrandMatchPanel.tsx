"use client";

import React, { useMemo } from "react";
import type { ShadeData, BrandData } from "@/types";
import { findSimilarShades } from "@/lib/colorMatching";
import { ExternalLink, Tag, Palette, X } from "lucide-react";
import shadesData from "@/data/shades.json";
import clsx from "clsx";

interface BrandMatchPanelProps {
  selectedShade: ShadeData | null;
  onClose: () => void;
  isOpen: boolean;
}

const FINISH_COLORS: Record<string, string> = {
  matte: "#8B5E3C",
  satin: "#C0917A",
  glossy: "#E8A0BF",
  sheer: "#F4D1CC",
};

function BrandCard({ brand, finish }: { brand: BrandData; finish: string }) {
  return (
    <a
      href={brand.buyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="brand-card"
      aria-label={`Shop ${brand.productName} by ${brand.brandName} for ${brand.currency === "USD" ? "$" : ""}${brand.price}`}
    >
      <div className="brand-card-left">
        <div className="brand-logo-placeholder" aria-hidden>
          {brand.brandName.slice(0, 2).toUpperCase()}
        </div>
        <div className="brand-info">
          <span className="brand-name">{brand.brandName}</span>
          <span className="product-name">{brand.productName}</span>
        </div>
      </div>
      <div className="brand-card-right">
        <span
          className="finish-badge-sm"
          style={{ backgroundColor: FINISH_COLORS[finish] || "#C0917A" }}
        >
          {finish}
        </span>
        <span className="brand-price">
          {brand.currency === "USD" ? "$" : brand.currency} {brand.price}
        </span>
        <ExternalLink size={14} className="shop-icon" />
      </div>
    </a>
  );
}

export default function BrandMatchPanel({
  selectedShade,
  onClose,
  isOpen,
}: BrandMatchPanelProps) {
  const allShades = shadesData as ShadeData[];

  // Near-match shades (Delta-E within 12)
  const nearMatches = useMemo(() => {
    if (!selectedShade) return [];
    return findSimilarShades(selectedShade.hexColor, allShades, 12)
      .filter((r) => r.shade.shadeId !== selectedShade.shadeId)
      .slice(0, 4);
  }, [selectedShade, allShades]);

  if (!selectedShade) return null;

  const minPrice = Math.min(...selectedShade.brands.map((b) => b.price));
  const maxPrice = Math.max(...selectedShade.brands.map((b) => b.price));

  return (
    <div className={clsx("brand-panel", { "panel-open": isOpen })}>
      <div className="brand-panel-inner">
        {/* Header */}
        <div className="panel-header">
          <div className="panel-header-left">
            <span
              className="panel-shade-swatch"
              style={{ backgroundColor: selectedShade.hexColor }}
            />
            <div>
              <h2 className="panel-shade-name">{selectedShade.name}</h2>
              <p className="panel-shade-meta">
                {selectedShade.finish} · {selectedShade.undertone} undertone ·{" "}
                {selectedShade.colorFamily}
              </p>
            </div>
          </div>
          <button
            className="panel-close-btn"
            onClick={onClose}
            aria-label="Close brand panel"
            id="close-brand-panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Price range */}
        <div className="price-range-row">
          <Tag size={13} />
          <span>
            {selectedShade.brands.length === 1
              ? `$${minPrice}`
              : `$${minPrice} – $${maxPrice}`}{" "}
            · {selectedShade.brands.length} brand
            {selectedShade.brands.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Exact brand matches */}
        <div className="panel-section">
          <h3 className="panel-section-title">
            <span
              className="section-dot"
              style={{ backgroundColor: selectedShade.hexColor }}
            />
            Exact Shade
          </h3>
          <div className="brand-list">
            {selectedShade.brands.map((brand, i) => (
              <BrandCard
                key={i}
                brand={brand}
                finish={selectedShade.finish}
              />
            ))}
          </div>
        </div>

        {/* Near-match shades */}
        {nearMatches.length > 0 && (
          <div className="panel-section">
            <h3 className="panel-section-title">
              <Palette size={13} />
              Similar Shades
            </h3>
            <div className="near-match-list">
              {nearMatches.map(({ shade, distance }) => (
                <div key={shade.shadeId} className="near-match-row">
                  <div className="near-match-left">
                    <span
                      className="near-swatch"
                      style={{ backgroundColor: shade.hexColor }}
                    />
                    <div>
                      <span className="near-shade-name">{shade.name}</span>
                      <span className="near-shade-meta">
                        ΔE {distance.toFixed(1)} · {shade.finish}
                      </span>
                    </div>
                  </div>
                  <div className="near-match-brands">
                    {shade.brands.slice(0, 2).map((b, i) => (
                      <a
                        key={i}
                        href={b.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="near-brand-chip"
                      >
                        {b.brandName} ${b.price}
                        <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
