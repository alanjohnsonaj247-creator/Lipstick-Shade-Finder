"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import CameraView from "@/components/CameraView";
import ShadeCarousel from "@/components/ShadeCarousel";
import BrandMatchPanel from "@/components/BrandMatchPanel";
import CompareView from "@/components/CompareView";
import SnapshotButton from "@/components/SnapshotButton";
import PrivacyBadge from "@/components/PrivacyBadge";
import { useCamera } from "@/hooks/useCamera";
import { useShadeSelection } from "@/hooks/useShadeSelection";
import type { ShadeData } from "@/types";
import { ShoppingBag, SlidersHorizontal, Upload } from "lucide-react";

export default function TryOnPage() {
  const camera = useCamera();
  const { selectedShade, selectShade, opacity, setOpacity } = useShadeSelection();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

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
      {/* Camera + canvas area */}
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

          {/* Upload photo */}
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

          {/* Shop / brand info — only shown when a shade is selected */}
          {selectedShade && (
            <button
              className={`tryon-ctrl-btn${brandPanelOpen ? " tryon-ctrl-btn--active" : ""}`}
              onClick={() => setBrandPanelOpen((v) => !v)}
              aria-label="Shop this shade"
              id="shop-shade-btn"
              title="Shop this shade"
            >
              <ShoppingBag size={18} />
            </button>
          )}

          {/* Snapshot */}
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

      {/* Bottom panel — shade carousel only, no price clutter */}
      <div className="tryon-bottom-panel">
        <ShadeCarousel />
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
