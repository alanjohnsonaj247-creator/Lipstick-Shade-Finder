"use client";

import React, { useMemo } from "react";
import type { ShadeData, BrandData } from "@/types";
import { findBrandMatches } from "@/lib/colorMatching";
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

  const matchResults = useMemo(() => {
    if (!selectedShade) return [];

    return findBrandMatches(selectedShade, allShades, {
      threshold: 12,
      maxResults: 6,
      excludeBrandNames: selectedShade.brands.map((brand) => brand.brandName),
    });
  }, [selectedShade, allShades]);

  if (!selectedShade) return null;

  const minPrice = Math.min(...selectedShade.brands.map((b) => b.price));
  const maxPrice = Math.max(...selectedShade.brands.map((b) => b.price));
  const nearIdentical = matchResults.filter(
    (result) => result.category === "near-identical"
  );
  const similarShades = matchResults.filter(
    (result) => result.category === "similar shade"
  );

  return (
    <div className={clsx("brand-panel", { "panel-open": isOpen })} id="brand-match-panel">
      <div className="brand-panel-inner">
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

        <div className="price-range-row">
          <Tag size={13} />
          <span>
            {selectedShade.brands.length === 1
              ? `$${minPrice}`
              : `$${minPrice} – $${maxPrice}`} · {selectedShade.brands.length} brand
            {selectedShade.brands.length > 1 ? "s" : ""}
          </span>
        </div>

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
                key={`${brand.brandName}-${i}`}
                brand={brand}
                finish={selectedShade.finish}
              />
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3 className="panel-section-title">
            <Palette size={13} />
            Color-based alternatives
          </h3>
          <p className="panel-section-copy">
            Matches are ranked by Lab-space Delta-E so they reflect how close the shades feel in color, not just their names.
          </p>

          {nearIdentical.length > 0 && (
            <div className="match-group">
              <div className="match-group-header">
                <span className="match-pill match-pill-identical">
                  Near-identical
                </span>
                <span className="match-group-caption">
                  Very close to the selected shade
                </span>
              </div>
              <div className="near-match-list">
                {nearIdentical.map(({ shade, distance }) => (
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
                      {shade.brands.slice(0, 2).map((brand, i) => (
                        <a
                          key={`${brand.brandName}-${i}`}
                          href={brand.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="near-brand-chip"
                        >
                          {brand.brandName} ${brand.price}
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {similarShades.length > 0 && (
            <div className="match-group">
              <div className="match-group-header">
                <span className="match-pill">Similar shade</span>
                <span className="match-group-caption">
                  Good alternatives in the same family
                </span>
              </div>
              <div className="near-match-list">
                {similarShades.map(({ shade, distance }) => (
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
                      {shade.brands.slice(0, 2).map((brand, i) => (
                        <a
                          key={`${brand.brandName}-${i}`}
                          href={brand.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="near-brand-chip"
                        >
                          {brand.brandName} ${brand.price}
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchResults.length === 0 && (
            <p className="panel-empty-state">
              No close matches were found in the catalog for this color.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
