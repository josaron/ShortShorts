import { getFFmpeg, writeFile, readFile, deleteFile, toBlob } from './client';

/**
 * Adjust the duration of a video clip to match a target duration
 * Uses speed adjustment to stretch or compress the video
 * @param videoBlob - Input video clip
 * @param targetDuration - Desired duration in seconds
 * @param currentDuration - Current duration in seconds
 * @returns Adjusted video as Blob
 */
export async function adjustDuration(
  videoBlob: Blob,
  targetDuration: number,
  currentDuration: number
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = 'input.mp4';
  const outputName = 'adjusted.mp4';

  // Calculate speed factor (< 1 = slow down, > 1 = speed up)
  const speedFactor = currentDuration / targetDuration;

  // Limit speed factor to reasonable range
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speedFactor));

  try {
    await writeFile(inputName, videoBlob);

    // Use setpts filter for video speed adjustment
    // setpts=PTS/speed for video (higher speed = faster)
    // Use 1/speed because setpts works inversely
    const ptsMultiplier = 1 / clampedSpeed;
    
    await ff.exec([
      '-i', inputName,
      '-filter:v', `setpts=${ptsMultiplier.toFixed(4)}*PTS`,
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
 * Get the duration of a video clip
 * @param videoBlob - Video to analyze
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoBlob);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = url;
  });
}

/**
 * Get video dimensions
 * @param videoBlob - Video to analyze
 * @returns Width and height
 */
export async function getVideoDimensions(videoBlob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoBlob);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = url;
  });
}

/**
 * Loop a video clip to reach a minimum duration
 * @param videoBlob - Input video clip
 * @param targetDuration - Minimum duration in seconds
 * @returns Video looped to at least target duration
 */
export async function loopToMinDuration(
  videoBlob: Blob,
  targetDuration: number
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = 'input.mp4';
  const outputName = 'looped.mp4';

  const currentDuration = await getVideoDuration(videoBlob);
  
  if (currentDuration >= targetDuration) {
    return videoBlob; // No looping needed
  }

  const loopCount = Math.ceil(targetDuration / currentDuration);

  try {
    await writeFile(inputName, videoBlob);

    await ff.exec([
      '-stream_loop', (loopCount - 1).toString(),
      '-i', inputName,
      '-t', targetDuration.toString(),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-an',
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
