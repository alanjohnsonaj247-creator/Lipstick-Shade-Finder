import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

// MediaPipe lip landmark indices (subset of 468 face landmarks)
// Outer lip contour (clockwise)
export const OUTER_LIP_INDICES = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17,
  84, 181, 91, 146, 61,
];

// Inner lip contour
export const INNER_LIP_INDICES = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14,
  87, 178, 88, 95, 78,
];

// Upper lip specific landmarks
export const UPPER_LIP_INDICES = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
  308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78,
];

// Lower lip specific landmarks
export const LOWER_LIP_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
  308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78,
];

let faceLandmarker: FaceLandmarker | null = null;
let isInitializing = false;

export type InitProgress = {
  stage: "loading" | "ready" | "error";
  message: string;
};

export async function initFaceLandmarker(
  onProgress?: (p: InitProgress) => void
): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  if (isInitializing) {
    // Wait for existing initialization
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (faceLandmarker) {
          clearInterval(check);
          resolve(faceLandmarker);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error("FaceLandmarker init timeout"));
      }, 30000);
    });
  }

  isInitializing = true;
  onProgress?.({ stage: "loading", message: "Loading face tracking model…" });

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    onProgress?.({ stage: "loading", message: "Initializing face landmarker…" });

    const createLandmarker = async (delegate: "GPU" | "CPU") =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate,
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });

    try {
      faceLandmarker = await createLandmarker("GPU");
    } catch (error) {
      console.warn("GPU face landmarker failed, falling back to CPU", error);
      faceLandmarker = await createLandmarker("CPU");
    }

    onProgress?.({ stage: "ready", message: "Ready" });
    isInitializing = false;
    return faceLandmarker;
  } catch (err) {
    isInitializing = false;
    onProgress?.({ stage: "error", message: "Failed to load model" });
    throw err;
  }
}

export function detectLandmarks(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): FaceLandmarkerResult {
  return landmarker.detectForVideo(video, timestampMs);
}

export function getLipLandmarks(
  result: FaceLandmarkerResult
): NormalizedLandmark[] | null {
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;
  return result.faceLandmarks[0];
}

export type { NormalizedLandmark, FaceLandmarkerResult };
