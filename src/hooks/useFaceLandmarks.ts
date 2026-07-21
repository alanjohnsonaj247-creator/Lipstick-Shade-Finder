"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  initFaceLandmarker,
  detectLandmarks,
  getLipLandmarks,
  type InitProgress,
} from "@/lib/faceTracking";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export interface FaceLandmarkState {
  landmarks: NormalizedLandmark[] | null;
  faceDetected: boolean;
  isLoading: boolean;
  initProgress: InitProgress | null;
  error: string | null;
  fps: number;
}

export function useFaceLandmarks(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean = true
) {
  const [state, setState] = useState<FaceLandmarkState>({
    landmarks: null,
    faceDetected: false,
    isLoading: false,
    initProgress: null,
    error: null,
    fps: 0,
  });

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const smoothedLandmarksRef = useRef<NormalizedLandmark[] | null>(null);

  const runLoop = useCallback(() => {
    if (!isRunningRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !landmarkerRef.current) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const now = performance.now();

    // Skip if same timestamp (video not advanced)
    if (now === lastTimeRef.current) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }
    lastTimeRef.current = now;

    try {
      const result = detectLandmarks(landmarkerRef.current, video, now);
      const rawLips = getLipLandmarks(result);

      let nextLips = rawLips;
      if (rawLips) {
        if (!smoothedLandmarksRef.current) {
          smoothedLandmarksRef.current = rawLips;
        } else {
          nextLips = rawLips.map((lm, index) => {
            const prev = smoothedLandmarksRef.current?.[index];
            if (!prev) return lm;
            const alpha = 0.35;
            return {
              x: prev.x + (lm.x - prev.x) * alpha,
              y: prev.y + (lm.y - prev.y) * alpha,
              z: prev.z !== undefined && lm.z !== undefined
                ? prev.z + (lm.z - prev.z) * alpha
                : undefined,
            } as NormalizedLandmark;
          });
        }
        smoothedLandmarksRef.current = nextLips;
      } else {
        smoothedLandmarksRef.current = null;
      }

      setState((s) => ({
        ...s,
        landmarks: nextLips,
        faceDetected: !!nextLips,
      }));
    } catch {
      // Ignore per-frame errors silently
    }

    // FPS counter
    frameCountRef.current++;
    if (now - fpsTimerRef.current >= 1000) {
      setState((s) => ({ ...s, fps: frameCountRef.current }));
      frameCountRef.current = 0;
      fpsTimerRef.current = now;
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      smoothedLandmarksRef.current = null;
      return;
    }

    let cancelled = false;

    async function init() {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const lm = await initFaceLandmarker((progress) => {
          if (!cancelled)
            setState((s) => ({ ...s, initProgress: progress }));
        });
        if (!cancelled) {
          landmarkerRef.current = lm;
          setState((s) => ({ ...s, isLoading: false, initProgress: null }));
          isRunningRef.current = true;
          fpsTimerRef.current = performance.now();
          rafRef.current = requestAnimationFrame(runLoop);
        }
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            isLoading: false,
            error: `Failed to initialize face tracking: ${(err as Error).message}`,
          }));
      }
    }

    init();

    return () => {
      cancelled = true;
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, runLoop]);

  return state;
}
