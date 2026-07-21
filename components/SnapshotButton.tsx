"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera, Download, Share2, Check } from "lucide-react";
import clsx from "clsx";

interface SnapshotButtonProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  shadeName?: string;
}

export default function SnapshotButton({ canvasRef, shadeName }: SnapshotButtonProps) {
  const [captured, setCaptured] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const captureSnapshot = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsCapturing(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/png"
        );
      });

      const filename = `shade-tryon-${shadeName?.replace(/\s+/g, "-").toLowerCase() || "snapshot"}-${Date.now()}.png`;

      // Try Web Share API (mobile)
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
        const file = new File([blob], filename, { type: "image/png" });
        try {
          await navigator.share({
            files: [file],
            title: `My Lipstick Try-On – ${shadeName || "Shade"}`,
            text: "Check out how this lipstick shade looks on me! 💄",
          });
        } catch {
          // User cancelled share, fall back to download
          downloadBlob(blob, filename);
        }
      } else {
        downloadBlob(blob, filename);
      }

      setCaptured(true);
      setTimeout(() => setCaptured(false), 2500);
    } catch (err) {
      console.error("Snapshot failed:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [canvasRef, shadeName]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = linkRef.current || document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <a ref={linkRef} style={{ display: "none" }} aria-hidden />
      <button
        className={clsx("snapshot-btn", { "snapshot-success": captured })}
        onClick={captureSnapshot}
        disabled={isCapturing}
        aria-label="Capture and save or share try-on photo"
        id="snapshot-btn"
        title="Capture photo"
      >
        {captured ? (
          <>
            <Check size={18} />
            <span>Saved!</span>
          </>
        ) : (
          <>
            <Camera size={18} />
            <span>Snap</span>
          </>
        )}
      </button>
    </>
  );
}
