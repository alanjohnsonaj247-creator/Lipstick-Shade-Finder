"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import ShadeSwatch from "./ShadeSwatch";
import AddColourModal from "./AddColourModal";
import type { ShadeData } from "@/types";
import { useShadeSelection, readSavedIds } from "@/hooks/useShadeSelection";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X, Plus, RotateCcw } from "lucide-react";
import clsx from "clsx";
import shadesData from "@/data/shades.json";

const BASE_SHADES = shadesData as ShadeData[];

const COLOR_FAMILIES = [
  { key: "saved", label: "❤️ Saved" },
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
  // Custom shades stored in localStorage
  const [customShades, setCustomShades] = useState<ShadeData[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("shade-finder-custom");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const ALL_SHADES = [...BASE_SHADES, ...customShades];

  const {
    selectedShade,
    selectShade,
    favoriteIds,
    toggleFavorite,
    restoreFavorites,
    compareShades,
    addToCompare,
    activeFilter,
    setFilter,
    clearFilters,
  } = useShadeSelection();

  // Restore banner — shows on mount if there are backed-up saves
  const [restoreIds, setRestoreIds] = useState<string[]>([]);
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    const backed = readSavedIds();
    if (backed.length > 0 && favoriteIds.length === 0) {
      setRestoreIds(backed);
      setShowRestore(true);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddShade = useCallback((shade: ShadeData) => {
    setCustomShades((prev) => {
      const next = [...prev, shade];
      try { localStorage.setItem("shade-finder-custom", JSON.stringify(next)); } catch {}
      return next;
    });
    selectShade(shade);
  }, [selectShade]);

  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  }, []);

  // Is the "Saved" tab active?
  const isSavedTab = activeFilter.colorFamily === "saved";

  // Filter shades
  const filteredShades = ALL_SHADES.filter((s) => {
    // Saved tab: show only hearted shades
    if (isSavedTab) return favoriteIds.includes(s.shadeId);

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

      {/* ── Restore saved shades banner ── */}
      {showRestore && (
        <div className="restore-banner" role="alert">
          <RotateCcw size={15} className="restore-icon" />
          <span className="restore-msg">
            You have <strong>{restoreIds.length}</strong> saved shade{restoreIds.length > 1 ? "s" : ""} — restore them?
          </span>
          <div className="restore-actions">
            <button
              className="restore-btn restore-yes"
              id="restore-saved-yes"
              onClick={() => {
                restoreFavorites(restoreIds);
                setShowRestore(false);
              }}
            >
              Yes, restore
            </button>
            <button
              className="restore-btn restore-no"
              id="restore-saved-no"
              onClick={() => setShowRestore(false)}
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* Color family tabs */}
      <div className="family-tabs-row">
        <div className="family-tabs">
          {COLOR_FAMILIES.map((f) => (
            <button
              key={f.key}
              className={clsx("family-tab", {
                "tab-active": (activeFilter.colorFamily || "all") === f.key,
                "tab-saved": f.key === "saved",
                "tab-saved-active":
                  f.key === "saved" && activeFilter.colorFamily === "saved",
              })}
              onClick={() =>
                setFilter("colorFamily", f.key === "all" ? null : f.key)
              }
              id={`family-tab-${f.key}`}
            >
              {f.label}
              {f.key === "saved" && favoriteIds.length > 0 && (
                <span className="saved-tab-count">{favoriteIds.length}</span>
              )}
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
            <div className={clsx("no-shades-msg", { "saved-empty-state": isSavedTab })}>
              {isSavedTab ? (
                <>
                  <span className="saved-empty-icon">🤍</span>
                  <span>No saved shades yet</span>
                  <span className="saved-empty-hint">
                    Tap ❤️ on any shade to save it — your picks stay here across refreshes
                  </span>
                </>
              ) : (
                <>
                  No shades match your filters.{" "}
                  <button onClick={clearFilters} className="inline-link">
                    Clear filters
                  </button>
                </>
              )}
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

          {/* ── Add Colour Button ── */}
          <button
            className="add-colour-swatch-btn"
            onClick={() => setShowAddModal(true)}
            aria-label="Add a custom lipstick colour"
            title="Add custom colour"
            id="add-custom-shade-btn"
          >
            <div className="add-colour-swatch-circle">
              <Plus size={20} />
            </div>
            <span className="add-colour-swatch-label">Add Colour</span>
          </button>
        </div>

        <button
          className="scroll-arrow scroll-right"
          onClick={() => scroll("right")}
          aria-label="Scroll shades right"
        >
          <ChevronRight size={18} />
        </button>
      </div>

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

      {/* Add Colour Modal */}
      {showAddModal && (
        <AddColourModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddShade}
        />
      )}
    </div>
  );
}
