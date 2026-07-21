"use client";

import React, { useRef, useCallback, useState } from "react";
import ShadeSwatch from "./ShadeSwatch";
import type { ShadeData } from "@/types";
import { useShadeSelection } from "@/hooks/useShadeSelection";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import shadesData from "@/data/shades.json";

const ALL_SHADES = Array.isArray(shadesData) ? (shadesData as ShadeData[]) : [];

const COLOR_FAMILIES = [
  { key: "all", label: "All" },
  { key: "reds", label: "Reds 🔴" },
  { key: "pinks", label: "Pinks 🩷" },
  { key: "nudes", label: "Nudes 🤎" },
  { key: "berries", label: "Berries 🫐" },
  { key: "browns", label: "Browns 🟤" },
  { key: "purples", label: "Purples 💜" },
];

const FINISHES = ["matte", "satin", "glossy", "sheer"];
const UNDERTONES = ["warm", "cool", "neutral"];
const OCCASIONS = ["everyday", "bold", "evening", "bridal"];

export default function ShadeCarousel() {
  const {
    selectedShade,
    selectShade,
    favoriteIds,
    toggleFavorite,
    compareShades,
    addToCompare,
    activeFilter,
    setFilter,
    clearFilters,
  } = useShadeSelection();

  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  }, []);

  // Filter shades
  const filteredShades = ALL_SHADES.filter((s) => {
    if (
      activeFilter.colorFamily &&
      activeFilter.colorFamily !== "all" &&
      s.colorFamily !== activeFilter.colorFamily
    )
      return false;
    if (activeFilter.finish && s.finish !== activeFilter.finish) return false;
    if (activeFilter.undertone && s.undertone !== activeFilter.undertone)
      return false;
    if (
      activeFilter.occasion &&
      !s.occasion.includes(activeFilter.occasion)
    )
      return false;
    if (activeFilter.priceMax) {
      const minPrice = Math.min(...s.brands.map((b) => b.price));
      if (minPrice > activeFilter.priceMax) return false;
    }
    return true;
  });

  const hasActiveFilters =
    activeFilter.finish ||
    activeFilter.undertone ||
    activeFilter.occasion ||
    activeFilter.priceMax;

  const handleKeyDown = (
    e: React.KeyboardEvent,
    shade: ShadeData,
    idx: number
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectShade(shade);
    }
    if (e.key === "ArrowRight") {
      const next = filteredShades[idx + 1];
      if (next) {
        selectShade(next);
        document.getElementById(`swatch-${next.shadeId}`)?.focus();
      }
    }
    if (e.key === "ArrowLeft") {
      const prev = filteredShades[idx - 1];
      if (prev) {
        selectShade(prev);
        document.getElementById(`swatch-${prev.shadeId}`)?.focus();
      }
    }
  };

  return (
    <div className="shade-carousel-container">
      {/* Color family tabs */}
      <div className="family-tabs-row">
        <div className="family-tabs">
          {COLOR_FAMILIES.map((f) => (
            <button
              key={f.key}
              className={clsx("family-tab", {
                "tab-active": (activeFilter.colorFamily || "all") === f.key,
              })}
              onClick={() =>
                setFilter("colorFamily", f.key === "all" ? null : f.key)
              }
              id={`family-tab-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          className={clsx("filter-toggle-btn", { "filter-active": hasActiveFilters })}
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Toggle filters"
          id="toggle-filters-btn"
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && <span className="filter-dot" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <span className="filter-label">Finish</span>
            <div className="filter-chips">
              {FINISHES.map((f) => (
                <button
                  key={f}
                  className={clsx("filter-chip", {
                    "chip-active": activeFilter.finish === f,
                  })}
                  onClick={() =>
                    setFilter("finish", activeFilter.finish === f ? null : f)
                  }
                  id={`filter-finish-${f}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-label">Undertone</span>
            <div className="filter-chips">
              {UNDERTONES.map((u) => (
                <button
                  key={u}
                  className={clsx("filter-chip", {
                    "chip-active": activeFilter.undertone === u,
                  })}
                  onClick={() =>
                    setFilter(
                      "undertone",
                      activeFilter.undertone === u ? null : u
                    )
                  }
                  id={`filter-undertone-${u}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-label">Occasion</span>
            <div className="filter-chips">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  className={clsx("filter-chip", {
                    "chip-active": activeFilter.occasion === o,
                  })}
                  onClick={() =>
                    setFilter(
                      "occasion",
                      activeFilter.occasion === o ? null : o
                    )
                  }
                  id={`filter-occasion-${o}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              id="clear-filters-btn"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Swatch row */}
      <div className="swatches-row-wrapper">
        <button
          className="scroll-arrow scroll-left"
          onClick={() => scroll("left")}
          aria-label="Scroll shades left"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={scrollRef}
          className="swatches-row"
          role="radiogroup"
          aria-label="Lipstick shade palette"
        >
          {filteredShades.length === 0 ? (
            <div className="no-shades-msg">
              No shades match your filters.{" "}
              <button onClick={clearFilters} className="inline-link">
                Clear filters
              </button>
            </div>
          ) : (
            filteredShades.map((shade, idx) => (
              <ShadeSwatch
                key={shade.shadeId}
                shade={shade}
                isSelected={selectedShade?.shadeId === shade.shadeId}
                isFavorited={favoriteIds.includes(shade.shadeId)}
                isInCompare={compareShades.some(
                  (c) => c.shadeId === shade.shadeId
                )}
                onSelect={() => selectShade(shade)}
                onToggleFavorite={() => toggleFavorite(shade.shadeId)}
                onAddToCompare={() => addToCompare(shade)}
                // @ts-expect-error: Extra props for keyboard nav
                onKeyDown={(e: React.KeyboardEvent) =>
                  handleKeyDown(e, shade, idx)
                }
              />
            ))
          )}
        </div>

        <button
          className="scroll-arrow scroll-right"
          onClick={() => scroll("right")}
          aria-label="Scroll shades right"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Selected shade info strip */}
      {selectedShade && (
        <div className="selected-shade-info">
          <span
            className="selected-swatch-mini"
            style={{ backgroundColor: selectedShade.hexColor }}
          />
          <div className="selected-shade-details">
            <span className="selected-shade-name">{selectedShade.name}</span>
            <span className="selected-shade-meta">
              {selectedShade.finish} · {selectedShade.undertone} undertone
            </span>
          </div>
          <button
            className="deselect-btn"
            onClick={() => selectShade(null)}
            aria-label="Remove shade"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
