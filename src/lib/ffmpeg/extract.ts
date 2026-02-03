import { getFFmpeg, writeFile, readFile, deleteFile, toBlob } from './client';

/**
 * Extract a clip from a video file
 * @param videoFile - Source video file
 * @param startTime - Start time in seconds
 * @param duration - Duration to extract in seconds
 * @returns Extracted video clip as Blob
 */
export async function extractClip(
  videoFile: File,
  startTime: number,
  duration: number = 10
): Promise<Blob> {
  const ff = await getFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'clip.mp4';

  try {
    // Write input file
    await writeFile(inputName, videoFile);

    // Extract clip without audio
    await ff.exec([
      '-ss', startTime.toString(),
      '-i', inputName,
      '-t', duration.toString(),
      '-an', // Remove audio
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-y',
      outputName,
    ]);

    // Read output file
    const data = await readFile(outputName);
    return toBlob(data, 'video/mp4');
  } finally {
    // Cleanup
    await deleteFile(inputName);
    await deleteFile(outputName);
  }
}

/**
 * Extract multiple clips from a video file efficiently
 * @param videoFile - Source video file
 * @param timestamps - Array of start times in seconds
 * @param duration - Duration for each clip
 * @param onProgress - Progress callback
 * @returns Array of extracted clips as Blobs
 */
export async function extractMultipleClips(
  videoFile: File,
  timestamps: number[],
  duration: number = 10,
  onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
  const ff = await getFFmpeg();
  const inputName = 'input.mp4';
  const clips: Blob[] = [];

  try {
    // Write input file once
    await writeFile(inputName, videoFile);

    for (let i = 0; i < timestamps.length; i++) {
      const startTime = timestamps[i];
      const outputName = `clip_${i}.mp4`;

      await ff.exec([
        '-ss', startTime.toString(),
        '-i', inputName,
        '-t', duration.toString(),
        '-an', // Remove audio
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-y',
        outputName,
      ]);

      const data = await readFile(outputName);
      clips.push(toBlob(data, 'video/mp4'));
      
      await deleteFile(outputName);
      onProgress?.(i + 1, timestamps.length);
    }

    return clips;
  } finally {
    await deleteFile(inputName);
  }
}

/**
 * Extract frames from a video clip for analysis
 * @param videoBlob - Video clip as Blob
 * @param interval - Interval between frames in seconds
 * @returns Array of frame images as Blobs
 */
export async function extractFrames(
  videoBlob: Blob,
  interval: number = 0.5
): Promise<Blob[]> {
  const ff = await getFFmpeg();
  const inputName = 'input.mp4';
  const frames: Blob[] = [];

  try {
    await writeFile(inputName, videoBlob);

    // Extract frames at specified interval
    await ff.exec([
      '-i', inputName,
      '-vf', `fps=1/${interval}`,
      '-f', 'image2',
      'frame_%03d.jpg',
    ]);

    // Read all extracted frames
    let frameIndex = 1;
    while (true) {
      const frameName = `frame_${frameIndex.toString().padStart(3, '0')}.jpg`;
      try {
        const data = await readFile(frameName);
        frames.push(toBlob(data, 'image/jpeg'));
        await deleteFile(frameName);
        frameIndex++;
      } catch {
        // No more frames
        break;
      }
    }

    return frames;
  } finally {
    await deleteFile(inputName);
  }
}
