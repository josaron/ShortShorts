import { detectFacesInFrame, getFaceCenter, initFaceDetector } from './detector';
import type { FaceDetection, CropRegion } from '@/types';

// Output dimensions
const OUTPUT_WIDTH = 720;
const OUTPUT_HEIGHT = 1280;
const TARGET_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT; // 0.5625 for 9:16

/**
 * Analyze frames from a video clip and return face centers
 * @param frames - Array of frame blobs (JPEG images)
 * @param onProgress - Progress callback
 * @returns Array of face center points (null if no face detected)
 */
export async function analyzeFramesForFaces(
  frames: Blob[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ x: number; y: number } | null>> {
  // Initialize detector
  await initFaceDetector();

  const results: Array<{ x: number; y: number } | null> = [];

  for (let i = 0; i < frames.length; i++) {
    try {
      const detections = await detectFacesInFrame(frames[i]);
      
      if (detections.length > 0) {
        // Use the face with highest confidence
        const bestFace = detections.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );
        results.push(getFaceCenter(bestFace));
      } else {
        results.push(null);
      }
    } catch (error) {
      console.warn(`Failed to detect faces in frame ${i}:`, error);
      results.push(null);
    }

    onProgress?.(i + 1, frames.length);
  }

  return results;
}

/**
 * Calculate optimal crop region based on face detections
 * @param faceCenters - Array of detected face centers
 * @param videoWidth - Original video width
 * @param videoHeight - Original video height
 * @returns Optimal crop region for 9:16 output
 */
export function calculateOptimalCrop(
  faceCenters: Array<{ x: number; y: number } | null>,
  videoWidth: number,
  videoHeight: number
): CropRegion {
  // Filter valid centers
  const validCenters = faceCenters.filter((c): c is { x: number; y: number } => c !== null);

  // Calculate average center if we have faces
  let targetCenterX = videoWidth / 2;
  let targetCenterY = videoHeight / 3; // Default to upper third

  if (validCenters.length > 0) {
    // Weight recent frames more heavily
    const weights = validCenters.map((_, i) => Math.pow(1.2, i / validCenters.length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    targetCenterX = validCenters.reduce((sum, c, i) => sum + c.x * weights[i], 0) / totalWeight;
    targetCenterY = validCenters.reduce((sum, c, i) => sum + c.y * weights[i], 0) / totalWeight;
  }

  // Calculate crop dimensions
  const videoAspect = videoWidth / videoHeight;
  let cropWidth: number;
  let cropHeight: number;

  if (videoAspect > TARGET_ASPECT) {
    // Video is wider than 9:16, crop horizontally
    cropHeight = videoHeight;
    cropWidth = Math.round(videoHeight * TARGET_ASPECT);
  } else {
    // Video is taller than 9:16, crop vertically
    cropWidth = videoWidth;
    cropHeight = Math.round(videoWidth / TARGET_ASPECT);
  }

  // Center crop on the target point
  let x = Math.round(targetCenterX - cropWidth / 2);
  let y = Math.round(targetCenterY - cropHeight / 3); // Keep face in upper third

  // Clamp to video bounds
  x = Math.max(0, Math.min(x, videoWidth - cropWidth));
  y = Math.max(0, Math.min(y, videoHeight - cropHeight));

  return {
    x,
    y,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Smooth crop regions across segments to avoid jarring transitions
 * @param cropRegions - Array of crop regions for each segment
 * @param smoothingFactor - How much to smooth (0-1, higher = more smooth)
 * @returns Smoothed crop regions
 */
export function smoothCropRegions(
  cropRegions: CropRegion[],
  smoothingFactor: number = 0.3
): CropRegion[] {
  if (cropRegions.length <= 1) {
    return cropRegions;
  }

  const smoothed: CropRegion[] = [cropRegions[0]];

  for (let i = 1; i < cropRegions.length; i++) {
    const prev = smoothed[i - 1];
    const curr = cropRegions[i];

    // Lerp between previous and current
    smoothed.push({
      x: Math.round(prev.x + (curr.x - prev.x) * (1 - smoothingFactor)),
      y: Math.round(prev.y + (curr.y - prev.y) * (1 - smoothingFactor)),
      width: curr.width, // Keep dimensions consistent
      height: curr.height,
    });
  }

  return smoothed;
}

/**
 * Get a simple center crop when face detection is not available
 * @param videoWidth - Original video width
 * @param videoHeight - Original video height
 * @returns Center crop region for 9:16 output
 */
export function getCenterCrop(videoWidth: number, videoHeight: number): CropRegion {
  return calculateOptimalCrop([], videoWidth, videoHeight);
}

/**
 * Validate crop region bounds
 */
export function validateCropRegion(
  region: CropRegion,
  videoWidth: number,
  videoHeight: number
): CropRegion {
  return {
    x: Math.max(0, Math.min(region.x, videoWidth - region.width)),
    y: Math.max(0, Math.min(region.y, videoHeight - region.height)),
    width: Math.min(region.width, videoWidth),
    height: Math.min(region.height, videoHeight),
  };
}
