"use client";

import React, { useState } from "react";
import { Shield, X } from "lucide-react";

export default function PrivacyBadge() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className="privacy-badge"
        onClick={() => setShowModal(true)}
        aria-label="Privacy information"
        id="privacy-badge-btn"
      >
        <Shield size={12} />
        <span>100% Private — processed on your device</span>
      </button>

      {showModal && (
        <div
          className="privacy-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Privacy Policy"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="privacy-modal">
            <button
              className="modal-close-btn"
              onClick={() => setShowModal(false)}
              aria-label="Close privacy info"
            >
              <X size={18} />
            </button>
            <div className="modal-icon">🔒</div>
            <h2 className="modal-title">Your Privacy Matters</h2>
            <div className="modal-body">
              <p>
                <strong>Shade Finder</strong> uses your device&apos;s camera
                solely to provide a real-time lipstick try-on experience.
              </p>
              <ul>
                <li>✅ Face detection runs 100% in your browser using WebAssembly</li>
                <li>✅ No video, images, or facial data are ever uploaded to any server</li>
                <li>✅ No biometric identifiers are stored or transmitted</li>
                <li>✅ Favorites are saved only to your browser&apos;s local storage</li>
                <li>✅ "Buy" links open the brand&apos;s own website — we don&apos;t track purchases</li>
              </ul>
              <p className="modal-footnote">
                You can revoke camera permission at any time through your
                browser settings. For uploaded photos, the image is processed
                locally and discarded when you leave the page.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
