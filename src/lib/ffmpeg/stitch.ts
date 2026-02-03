import { getFFmpeg, writeFile, readFile, deleteFile, toBlob } from './client';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT } from './crop';

interface StitchSegment {
  video: Blob;
  audio: Blob;
  duration: number;
}

/**
 * Stitch multiple video/audio segments into a single video
 * @param segments - Array of video/audio segment pairs
 * @param backgroundMusic - Optional background music blob
 * @param musicVolume - Volume for background music (0-1)
 * @returns Final stitched video as Blob
 */
export async function stitchSegments(
  segments: StitchSegment[],
  backgroundMusic?: Blob | null,
  musicVolume: number = 0.15
): Promise<Blob> {
  const ff = await getFFmpeg();
  
  const segmentFiles: string[] = [];
  const audioFiles: string[] = [];

  try {
    // Write all segment files
    for (let i = 0; i < segments.length; i++) {
      const videoName = `segment_${i}.mp4`;
      const audioName = `audio_${i}.wav`;
      
      await writeFile(videoName, segments[i].video);
      await writeFile(audioName, segments[i].audio);
      
      segmentFiles.push(videoName);
      audioFiles.push(audioName);
    }

    // Create concat file for videos
    const concatContent = segmentFiles.map((f) => `file '${f}'`).join('\n');
    await writeFile('concat.txt', new TextEncoder().encode(concatContent));

    // Concatenate videos
    await ff.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-y',
      'video_only.mp4',
    ]);

    // Concatenate all audio segments
    const audioInputs: string[] = [];
    const audioFilterParts: string[] = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      audioInputs.push('-i', audioFiles[i]);
      audioFilterParts.push(`[${i}:a]`);
    }

    const audioConcat = `${audioFilterParts.join('')}concat=n=${audioFiles.length}:v=0:a=1[voiceover]`;

    if (backgroundMusic) {
      // Add background music mixed with voiceover
      await writeFile('music.mp3', backgroundMusic);

      // Calculate total duration
      const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

      await ff.exec([
        ...audioInputs,
        '-i', 'music.mp3',
        '-filter_complex',
        `${audioConcat};[${audioFiles.length}:a]volume=${musicVolume}[music];[voiceover][music]amix=inputs=2:duration=first[aout]`,
        '-map', '[aout]',
        '-t', totalDuration.toString(),
        '-y',
        'audio_mixed.wav',
      ]);
    } else {
      // Just concatenate voiceover
      await ff.exec([
        ...audioInputs,
        '-filter_complex', audioConcat,
        '-map', '[voiceover]',
        '-y',
        'audio_mixed.wav',
      ]);
    }

    // Combine video and audio
    await ff.exec([
      '-i', 'video_only.mp4',
      '-i', 'audio_mixed.wav',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      'final.mp4',
    ]);

    const data = await readFile('final.mp4');
    return toBlob(data, 'video/mp4');
  } finally {
    // Cleanup all files
    for (const f of segmentFiles) await deleteFile(f);
    for (const f of audioFiles) await deleteFile(f);
    await deleteFile('concat.txt');
    await deleteFile('video_only.mp4');
    await deleteFile('audio_mixed.wav');
    await deleteFile('music.mp3');
    await deleteFile('final.mp4');
  }
}

/**
 * Add audio to a video file
 * @param videoBlob - Video without audio
 * @param audioBlob - Audio to add
 * @returns Video with audio as Blob
 */
export async function addAudioToVideo(
  videoBlob: Blob,
  audioBlob: Blob
): Promise<Blob> {
  const ff = await getFFmpeg();
  
  try {
    await writeFile('video.mp4', videoBlob);
    await writeFile('audio.wav', audioBlob);

    await ff.exec([
      '-i', 'video.mp4',
      '-i', 'audio.wav',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      'output.mp4',
    ]);

    const data = await readFile('output.mp4');
    return toBlob(data, 'video/mp4');
  } finally {
    await deleteFile('video.mp4');
    await deleteFile('audio.wav');
    await deleteFile('output.mp4');
  }
}

/**
 * Create a blank video with solid color for transitions
 * @param duration - Duration in seconds
 * @param color - Hex color (e.g., '000000' for black)
 * @returns Blank video as Blob
 */
export async function createBlankVideo(
  duration: number,
  color: string = '000000'
): Promise<Blob> {
  const ff = await getFFmpeg();
  
  try {
    await ff.exec([
      '-f', 'lavfi',
      '-i', `color=c=${color}:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${duration}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-y',
      'blank.mp4',
    ]);

    const data = await readFile('blank.mp4');
    return toBlob(data, 'video/mp4');
  } finally {
    await deleteFile('blank.mp4');
  }
}
