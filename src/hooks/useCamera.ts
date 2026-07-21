"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unsupported"
  | "photo";

export interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  error: string | null;
  isPhotoMode: boolean;
  photoDataUrl: string | null;
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    status: "idle",
    stream: null,
    error: null,
    isPhotoMode: false,
    photoDataUrl: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((s) => ({
        ...s,
        status: "unsupported",
        error: "Camera not supported in this browser.",
      }));
      return;
    }

    setState((s) => ({ ...s, status: "requesting", error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setState({
        status: "active",
        stream,
        error: null,
        isPhotoMode: false,
        photoDataUrl: null,
      });
    } catch (err: unknown) {
      const error = err as DOMException;
      const denied =
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError";
      setState((s) => ({
        ...s,
        status: denied ? "denied" : "unsupported",
        error: denied
          ? "Camera permission was denied. Please allow camera access and refresh."
          : `Could not start camera: ${error.message}`,
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState((s) => ({ ...s, status: "idle", stream: null }));
  }, []);

  const loadPhoto = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setState((s) => ({
        ...s,
        status: "photo",
        isPhotoMode: true,
        photoDataUrl: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const switchToCamera = useCallback(() => {
    setState((s) => ({
      ...s,
      isPhotoMode: false,
      photoDataUrl: null,
      status: "idle",
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    ...state,
    startCamera,
    stopCamera,
    loadPhoto,
    switchToCamera,
  };
}
