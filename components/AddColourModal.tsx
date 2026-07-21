"use client";

import React, { useState, useCallback } from "react";
import { X, Plus, Check } from "lucide-react";
import type { ShadeData } from "@/types";
import clsx from "clsx";

interface AddColourModalProps {
  onClose: () => void;
  onAdd: (shade: ShadeData) => void;
}

const FINISH_OPTIONS = ["matte", "satin", "glossy", "sheer"] as const;
const UNDERTONE_OPTIONS = ["warm", "cool", "neutral"] as const;
const FAMILY_OPTIONS = ["reds", "pinks", "nudes", "berries", "browns", "purples"] as const;

// Suggested quick-pick colours
const QUICK_PICKS = [
  "#FF6B6B", "#FF4081", "#C2185B", "#880E4F",
  "#FF8A65", "#A1887F", "#795548", "#4E342E",
  "#CE93D8", "#9C27B0", "#673AB7", "#3F51B5",
  "#F48FB1", "#F06292", "#EC407A", "#E91E63",
  "#FFAB91", "#FF7043", "#BF360C", "#E64A19",
  "#B39DDB", "#7E57C2", "#512DA8", "#311B92",
];

export default function AddColourModal({ onClose, onAdd }: AddColourModalProps) {
  const [hex, setHex] = useState("#C0392B");
  const [name, setName] = useState("");
  const [finish, setFinish] = useState<typeof FINISH_OPTIONS[number]>("matte");
  const [undertone, setUndertone] = useState<typeof UNDERTONE_OPTIONS[number]>("neutral");
  const [family, setFamily] = useState<typeof FAMILY_OPTIONS[number]>("reds");
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = useCallback(() => {
    if (!name.trim()) {
      setError("Please enter a shade name.");
      return;
    }
    setError("");

    const newShade: ShadeData = {
      shadeId: `custom-${Date.now()}`,
      name: name.trim(),
      hexColor: hex,
      finish,
      undertone,
      colorFamily: family,
      occasion: ["everyday"],
      brands: brandName.trim()
        ? [
            {
              brandName: brandName.trim(),
              productName: productName.trim() || name.trim(),
              price: parseFloat(price) || 0,
              currency: "USD",
              buyUrl: buyUrl.trim() || "#",
              imageUrl: "",
            },
          ]
        : [
            {
              brandName: "My Collection",
              productName: name.trim(),
              price: 0,
              currency: "USD",
              buyUrl: "#",
              imageUrl: "",
            },
          ],
    };

    onAdd(newShade);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  }, [hex, name, finish, undertone, family, brandName, productName, price, buyUrl, onAdd, onClose]);

  return (
    <div
      className="add-colour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add custom lipstick colour"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="add-colour-modal">
        {/* Header */}
        <div className="add-modal-header">
          <div className="add-modal-title-row">
            <Plus size={18} className="add-modal-icon" />
            <h2 className="add-modal-title">Add Custom Shade</h2>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="add-modal-body">
          {/* Color picker row */}
          <div className="add-colour-picker-row">
            <div className="add-colour-preview-wrap">
              <span
                className="add-colour-preview"
                style={{ backgroundColor: hex }}
              />
              <div>
                <label className="add-field-label" htmlFor="custom-hex-input">
                  Pick a Colour
                </label>
                <div className="hex-input-row">
                  <input
                    id="custom-hex-input"
                    type="color"
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    className="native-colour-picker"
                    aria-label="Colour picker"
                  />
                  <input
                    type="text"
                    value={hex}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setHex(v);
                    }}
                    className="hex-text-input"
                    placeholder="#C0392B"
                    aria-label="Hex colour value"
                    maxLength={7}
                    id="hex-text-input"
                  />
                </div>
              </div>
            </div>

            {/* Quick pick swatches */}
            <div className="quick-picks-grid">
              <span className="add-field-label">Quick Picks</span>
              <div className="quick-picks-row">
                {QUICK_PICKS.map((c) => (
                  <button
                    key={c}
                    className={clsx("quick-pick-btn", { "qp-active": hex === c })}
                    style={{ backgroundColor: c }}
                    onClick={() => setHex(c)}
                    aria-label={`Select colour ${c}`}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Shade name */}
          <div className="add-field-group">
            <label className="add-field-label" htmlFor="shade-name-input">
              Shade Name <span className="required-star">*</span>
            </label>
            <input
              id="shade-name-input"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Coral Sunset"
              className={clsx("add-text-input", { "input-error": error })}
              maxLength={40}
            />
            {error && <p className="field-error">{error}</p>}
          </div>

          {/* Finish + Undertone row */}
          <div className="add-row-2col">
            <div className="add-field-group">
              <span className="add-field-label">Finish</span>
              <div className="chip-selector">
                {FINISH_OPTIONS.map((f) => (
                  <button
                    key={f}
                    className={clsx("selector-chip", { "chip-active": finish === f })}
                    onClick={() => setFinish(f)}
                    id={`finish-${f}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="add-field-group">
              <span className="add-field-label">Undertone</span>
              <div className="chip-selector">
                {UNDERTONE_OPTIONS.map((u) => (
                  <button
                    key={u}
                    className={clsx("selector-chip", { "chip-active": undertone === u })}
                    onClick={() => setUndertone(u)}
                    id={`undertone-${u}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Colour family */}
          <div className="add-field-group">
            <span className="add-field-label">Colour Family</span>
            <div className="chip-selector chip-wrap">
              {FAMILY_OPTIONS.map((fam) => (
                <button
                  key={fam}
                  className={clsx("selector-chip", { "chip-active": family === fam })}
                  onClick={() => setFamily(fam)}
                  id={`family-${fam}`}
                >
                  {fam}
                </button>
              ))}
            </div>
          </div>

          {/* Optional brand info */}
          <details className="brand-details">
            <summary className="brand-details-summary">
              Add Brand Info (optional)
            </summary>
            <div className="brand-details-body">
              <div className="add-row-2col">
                <div className="add-field-group">
                  <label className="add-field-label" htmlFor="brand-name-input">Brand</label>
                  <input
                    id="brand-name-input"
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. MAC"
                    className="add-text-input"
                  />
                </div>
                <div className="add-field-group">
                  <label className="add-field-label" htmlFor="product-name-input">Product</label>
                  <input
                    id="product-name-input"
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Ruby Woo"
                    className="add-text-input"
                  />
                </div>
              </div>
              <div className="add-row-2col">
                <div className="add-field-group">
                  <label className="add-field-label" htmlFor="price-input">Price (USD)</label>
                  <input
                    id="price-input"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 22"
                    className="add-text-input"
                    min="0"
                  />
                </div>
                <div className="add-field-group">
                  <label className="add-field-label" htmlFor="buy-url-input">Buy URL</label>
                  <input
                    id="buy-url-input"
                    type="url"
                    value={buyUrl}
                    onChange={(e) => setBuyUrl(e.target.value)}
                    placeholder="https://..."
                    className="add-text-input"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="add-modal-footer">
          {/* Live preview */}
          <div className="add-preview-chip">
            <span className="add-preview-dot" style={{ backgroundColor: hex }} />
            <span className="add-preview-name">{name || "Shade Name"}</span>
            <span className="add-preview-finish">{finish}</span>
          </div>

          <div className="add-modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className={clsx("btn-primary add-confirm-btn", { "btn-success": added })}
              onClick={handleAdd}
              id="confirm-add-shade-btn"
              disabled={added}
            >
              {added ? (
                <>
                  <Check size={16} />
                  Added!
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add to Palette
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
