"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { useFaceLandmarks } from "@/hooks/useFaceLandmarks";
import { LipOverlayRenderer } from "@/lib/lipOverlayRenderer";
import type { ShadeData } from "@/types";
import { Camera, Upload, AlertCircle, Loader2, Smile } from "lucide-react";
import type { CameraStatus } from "@/hooks/useCamera";

interface CameraViewProps {
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  selectedShade: ShadeData | null;
  opacity: number;
  onStartCamera: () => void;
  onLoadPhoto: (file: File) => void;
  isPhotoMode: boolean;
  photoDataUrl: string | null;
  showDebugLandmarks?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function CameraView({
  stream,
  status,
  error,
  selectedShade,
  opacity,
  onStartCamera,
  onLoadPhoto,
  isPhotoMode,
  photoDataUrl,
  showDebugLandmarks = false,
  onCanvasReady,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LipOverlayRenderer | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rendererReady, setRendererReady] = useState(false);

  const isActive = status === "active";
  const { landmarks, faceDetected, isLoading, initProgress, fps } =
    useFaceLandmarks(videoRef, isActive);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  // Initialize WebGL renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current = new LipOverlayRenderer({ canvas });
      setRendererReady(true);
      onCanvasReady?.(canvas);
    } catch (e) {
      console.warn("WebGL2 renderer init failed:", e);
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main render loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (isActive && video && video.readyState >= 2) {
      renderer.resizeToVideo(video);
      renderer.render(video, landmarks || null, selectedShade, opacity);
    } else if (isPhotoMode && photoImgRef.current) {
      // Draw static photo
      const img = photoImgRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      }
    }

    // Debug landmark overlay
    if (showDebugLandmarks && landmarks) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(0,255,100,0.7)";
        landmarks.forEach((lm) => {
          ctx.beginPath();
          ctx.arc(
            lm.x * canvas.width,
            lm.y * canvas.height,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
      }
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }, [isActive, isPhotoMode, landmarks, selectedShade, opacity, showDebugLandmarks]);

  useEffect(() => {
    if (!rendererReady) return;
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rendererReady, renderFrame]);

  // Photo mode image loading
  useEffect(() => {
    if (!photoDataUrl) {
      photoImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      photoImgRef.current = img;
    };
    img.src = photoDataUrl;
  }, [photoDataUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoadPhoto(file);
  };

  return (
    <div className="camera-view-container">
      {/* Hidden video element — always mounted so refs work */}
      <video
        ref={videoRef}
        className="camera-video-hidden"
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />

      {/* WebGL Canvas — main display */}
      <canvas
        ref={canvasRef}
        className="camera-canvas"
        style={{
          transform: isActive ? "scaleX(-1)" : "none", // mirror for front cam
          display:
            status === "active" || status === "photo" ? "block" : "none",
        }}
      />

      {/* Overlays for non-active states */}
      {status === "idle" && (
        <div className="camera-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon-ring">
              <Camera size={40} />
            </div>
            <h2 className="placeholder-title">Virtual Try-On</h2>
            <p className="placeholder-subtitle">
              See how any lipstick shade looks on you — live.
            </p>
            <div className="placeholder-actions">
              <button
                className="btn-primary"
                onClick={onStartCamera}
                id="start-camera-btn"
              >
                <Camera size={18} />
                Enable Camera
              </button>
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                id="upload-photo-btn"
              >
                <Upload size={18} />
                Upload Photo
              </button>
            </div>
            <p className="privacy-note">
              🔒 Your camera is processed entirely on your device and never uploaded.
            </p>
          </div>
        </div>
      )}

      {status === "requesting" && (
        <div className="camera-placeholder">
          <div className="placeholder-content">
            <Loader2 size={40} className="animate-spin text-rose-400" />
            <p className="placeholder-subtitle">Requesting camera access…</p>
          </div>
        </div>
      )}

      {(status === "denied" || status === "unsupported") && (
        <div className="camera-placeholder camera-error">
          <div className="placeholder-content">
            <AlertCircle size={40} className="text-rose-500" />
            <h2 className="placeholder-title">Camera Unavailable</h2>
            <p className="placeholder-subtitle">{error}</p>
            <div className="placeholder-actions">
              <button className="btn-primary" onClick={onStartCamera}>
                Try Again
              </button>
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                Upload Photo Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay (model init) */}
      {isActive && isLoading && (
        <div className="camera-loading-overlay">
          <Loader2 size={28} className="animate-spin text-white" />
          <p>{initProgress?.message || "Loading face tracking…"}</p>
        </div>
      )}

      {/* No face detected hint */}
      {isActive && !isLoading && !faceDetected && (
        <div className="face-hint">
          <Smile size={16} />
          Position your face in the frame
        </div>
      )}

      {/* FPS badge (dev mode only) */}
      {isActive && process.env.NODE_ENV === "development" && (
        <div className="fps-badge">{fps} fps</div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
        id="photo-file-input"
      />
    </div>
  );
}
