"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import CameraView from "@/components/CameraView";
import ShadeCarousel from "@/components/ShadeCarousel";
import BrandMatchButton from "@/components/BrandMatchButton";
import BrandMatchPanel from "@/components/BrandMatchPanel";
import CompareView from "@/components/CompareView";
import SnapshotButton from "@/components/SnapshotButton";
import PrivacyBadge from "@/components/PrivacyBadge";
import MatchRating from "@/components/MatchRating";
import { useCamera } from "@/hooks/useCamera";
import { useShadeSelection } from "@/hooks/useShadeSelection";
import type { ShadeData } from "@/types";
import { ShoppingBag, SlidersHorizontal, Upload, ChevronUp } from "lucide-react";

export default function TryOnPage() {
  const camera = useCamera();
  const { selectedShade, selectShade, opacity, setOpacity } = useShadeSelection();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleCompareSelect = useCallback(
    (shade: ShadeData) => {
      selectShade(shade);
    },
    [selectShade]
  );

  useEffect(() => {
    setBrandPanelOpen(false);
  }, [selectedShade?.shadeId]);

  return (
    <div className="tryon-page">
      {/* Camera fills full screen */}
      <div className="tryon-camera-area">
        <CameraView
          stream={camera.stream}
          status={camera.status}
          error={camera.error}
          selectedShade={selectedShade}
          opacity={opacity}
          onStartCamera={camera.startCamera}
          onLoadPhoto={camera.loadPhoto}
          isPhotoMode={camera.isPhotoMode}
          photoDataUrl={camera.photoDataUrl}
          onCanvasReady={handleCanvasReady}
        />

        {/* Floating controls — top left */}
        <div className="tryon-top-controls">
          <PrivacyBadge />
        </div>

        {/* Floating controls — top right */}
        <div className="tryon-top-right-controls">
          {/* Match Rating toggle */}
          <MatchRating selectedShade={selectedShade} canvasRef={canvasRef} />

          {/* Opacity / intensity slider toggle */}
          <button
            className="tryon-ctrl-btn"
            onClick={() => setShowOpacitySlider((v) => !v)}
            aria-label="Adjust intensity"
            id="opacity-toggle-btn"
            title="Adjust intensity"
          >
            <SlidersHorizontal size={18} />
          </button>

          <button
            className="tryon-ctrl-btn"
            onClick={() =>
              document.getElementById("photo-file-input")?.click()
            }
            aria-label="Upload a photo"
            id="upload-photo-tryon-btn"
            title="Upload photo"
          >
            <Upload size={18} />
          </button>

          {(camera.status === "active" || camera.status === "photo") && (
            <SnapshotButton
              canvasRef={canvasRef}
              shadeName={selectedShade?.name}
            />
          )}
        </div>

        {/* Opacity slider overlay */}
        {showOpacitySlider && (
          <div className="opacity-slider-overlay">
            <span className="opacity-label">Intensity</span>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="opacity-slider"
              aria-label="Lipstick intensity"
              id="opacity-range-input"
            />
            <span className="opacity-value">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        {/* Compare bar */}
        <CompareView onSelectCompareShade={handleCompareSelect} />
      </div>

      {/* ── Floating bottom panel ── */}
      <div className={`tryon-bottom-panel ${panelExpanded ? "panel-expanded" : "panel-collapsed"}`}>

        {/* Handle bar — always visible, click to expand/collapse */}
        <div
          className="panel-handle"
          onClick={() => setPanelExpanded((v) => !v)}
          role="button"
          aria-label={panelExpanded ? "Collapse shade panel" : "Expand shade panel"}
          id="panel-toggle-handle"
        >
          <div className="panel-drag-knob" />

          {/* Compact shade info shown when collapsed */}
          {selectedShade ? (
            <div className="panel-shade-chip">
              <div
                className="panel-shade-dot"
                style={{ background: selectedShade.hexColor }}
              />
              <span className="panel-shade-name-mini">{selectedShade.name}</span>
              <span className="panel-shade-sep">·</span>
              <span className="panel-shade-meta-mini">
                {selectedShade.finish}
              </span>
            </div>
          ) : (
            <span className="panel-hint-text">Tap a shade to try it on</span>
          )}

          <ChevronUp
            size={15}
            className={`panel-chevron ${panelExpanded ? "chevron-up" : "chevron-down"}`}
          />
        </div>

        {/* Shade carousel — always rendered; CSS hides heavy bits when collapsed */}
        <ShadeCarousel />

        {/* Shop button — only shown when expanded */}
        {selectedShade && (
          <div className="tryon-bottom-actions">
            <BrandMatchButton
              selectedShade={selectedShade}
              isOpen={brandPanelOpen}
              onToggle={() => setBrandPanelOpen((prev) => !prev)}
            />

            <button
              className="view-brands-btn"
              onClick={() => setBrandPanelOpen(true)}
              id="view-brands-btn"
            >
              <ShoppingBag size={16} />
              Shop {selectedShade.name} — {selectedShade.brands.length} brand
              {selectedShade.brands.length > 1 ? "s" : ""} from $
              {Math.min(...selectedShade.brands.map((b) => b.price))}
            </button>
          </div>
        )}
      </div>

      {/* Brand match panel (slide-up drawer) */}
      <BrandMatchPanel
        selectedShade={selectedShade}
        onClose={() => setBrandPanelOpen(false)}
        isOpen={brandPanelOpen}
      />
    </div>
  );
}
