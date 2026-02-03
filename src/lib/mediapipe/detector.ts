import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceDetection } from '@/types';

let faceDetector: FaceDetector | null = null;
let isLoading = false;
let loadPromise: Promise<FaceDetector> | null = null;

/**
 * Initialize the MediaPipe Face Detector
 */
export async function initFaceDetector(): Promise<FaceDetector> {
  if (faceDetector) {
    return faceDetector;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = loadFaceDetector();
  return loadPromise;
}

async function loadFaceDetector(): Promise<FaceDetector> {
  if (isLoading) {
    throw new Error('Face detector is already being loaded');
  }

  isLoading = true;

  try {
    console.log('Loading MediaPipe Face Detector...');

    // Load the vision WASM files
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // Create the face detector
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });

    console.log('Face Detector loaded successfully');
    return faceDetector;
  } catch (error) {
    console.error('Failed to load Face Detector:', error);
    throw error;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
}

/**
 * Detect faces in an image
 * @param image - Image element, canvas, or image data
 * @returns Array of face detections
 */
export async function detectFaces(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<FaceDetection[]> {
  const detector = await initFaceDetector();
  
  const result = detector.detect(image);
  
  return result.detections.map((detection, index) => {
    const bbox = detection.boundingBox;
    
    if (!bbox) {
      return null;
    }

    return {
      timestamp: 0,
      boundingBox: {
        x: bbox.originX,
        y: bbox.originY,
        width: bbox.width,
        height: bbox.height,
      },
      confidence: detection.categories?.[0]?.score ?? 0,
    };
  }).filter((d): d is FaceDetection => d !== null);
}

/**
 * Detect faces in a video frame blob
 * @param frameBlob - JPEG image blob
 * @returns Array of face detections
 */
export async function detectFacesInFrame(frameBlob: Blob): Promise<FaceDetection[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(frameBlob);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const detections = await detectFaces(img);
        resolve(detections);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load frame image'));
    };

    img.src = url;
  });
}

/**
 * Get face center from detection
 */
export function getFaceCenter(detection: FaceDetection): { x: number; y: number } {
  return {
    x: detection.boundingBox.x + detection.boundingBox.width / 2,
    y: detection.boundingBox.y + detection.boundingBox.height / 2,
  };
}

/**
 * Check if face detector is loaded
 */
export function isFaceDetectorLoaded(): boolean {
  return faceDetector !== null;
}

/**
 * Dispose of the face detector to free resources
 */
export function disposeFaceDetector(): void {
  if (faceDetector) {
    faceDetector.close();
    faceDetector = null;
  }
}
