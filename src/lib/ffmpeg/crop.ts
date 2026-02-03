import { getFFmpeg, writeFile, readFile, deleteFile, toBlob } from './client';
import type { CropRegion } from '@/types';

// Output dimensions for 9:16 aspect ratio
export const OUTPUT_WIDTH = 720;
export const OUTPUT_HEIGHT = 1280;

/**
 * Crop a video clip to 9:16 aspect ratio with specified crop region
 * @param videoBlob - Input video clip
 * @param cropRegion - Region to crop from the original video
 * @returns Cropped video as Blob
 */
export async function cropVideo(
  videoBlob: Blob,
  cropRegion: CropRegion
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = 'input.mp4';
  const outputName = 'cropped.mp4';

  try {
    await writeFile(inputName, videoBlob);

    // Crop and scale to 720x1280
    const cropFilter = `crop=${cropRegion.width}:${cropRegion.height}:${cropRegion.x}:${cropRegion.y},scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}`;

    await ff.exec([
      '-i', inputName,
      '-vf', cropFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-an', // No audio
      '-y',
      outputName,
    ]);

    const data = await readFile(outputName);
    return toBlob(data, 'video/mp4');
  } finally {
    await deleteFile(inputName);
    await deleteFile(outputName);
  }
}

/**
 * Calculate the crop region for 9:16 output given video dimensions and face center
 * @param videoWidth - Original video width
 * @param videoHeight - Original video height
 * @param faceCenter - Center point of detected face (optional)
 * @returns Crop region optimized for 9:16 output
 */
export function calculateCropRegion(
  videoWidth: number,
  videoHeight: number,
  faceCenter?: { x: number; y: number }
): CropRegion {
  // Target aspect ratio: 9:16 = 0.5625
  const targetAspect = 9 / 16;
  const videoAspect = videoWidth / videoHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (videoAspect > targetAspect) {
    // Video is wider than 9:16, crop width
    cropHeight = videoHeight;
    cropWidth = Math.round(videoHeight * targetAspect);
  } else {
    // Video is taller than 9:16, crop height
    cropWidth = videoWidth;
    cropHeight = Math.round(videoWidth / targetAspect);
  }

  // Default to center crop
  let x = Math.round((videoWidth - cropWidth) / 2);
  let y = Math.round((videoHeight - cropHeight) / 2);

  // Adjust for face center if provided
  if (faceCenter) {
    // Try to center the face horizontally
    x = Math.round(faceCenter.x - cropWidth / 2);
    // Keep face in upper third vertically
    y = Math.round(faceCenter.y - cropHeight / 3);

    // Clamp to video bounds
    x = Math.max(0, Math.min(x, videoWidth - cropWidth));
    y = Math.max(0, Math.min(y, videoHeight - cropHeight));
  }

  return {
    x,
    y,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Apply smart crop to a video clip based on face detection results
 * @param videoBlob - Input video clip
 * @param faceCenters - Array of face center points for each analyzed frame
 * @param videoWidth - Original video width
 * @param videoHeight - Original video height
 * @returns Cropped video as Blob
 */
export async function smartCrop(
  videoBlob: Blob,
  faceCenters: Array<{ x: number; y: number } | null>,
  videoWidth: number,
  videoHeight: number
): Promise<Blob> {
  // Calculate average face center from detected faces
  const validCenters = faceCenters.filter((c): c is { x: number; y: number } => c !== null);
  
  let averageCenter: { x: number; y: number } | undefined;
  
  if (validCenters.length > 0) {
    const sumX = validCenters.reduce((sum, c) => sum + c.x, 0);
    const sumY = validCenters.reduce((sum, c) => sum + c.y, 0);
    averageCenter = {
      x: sumX / validCenters.length,
      y: sumY / validCenters.length,
    };
  }

  const cropRegion = calculateCropRegion(videoWidth, videoHeight, averageCenter);
  return cropVideo(videoBlob, cropRegion);
}
