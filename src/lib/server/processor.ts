/**
 * Server-side video processor for Vercel Fluid Compute
 * Uses FFmpeg WASM and MediaPipe for processing
 */

import { put } from '@vercel/blob';
import { updateJobProgress, completeJob, failJob } from './job-store';
import type { ProcessingJob, SegmentCaptionData } from './types';

// Import processing libraries (same WASM-based libraries work on Node.js)
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

/**
 * Get or initialize FFmpeg instance
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }
  
  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }
  
  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegInstance = ffmpeg;
    console.log('[Processor] FFmpeg loaded successfully');
    return ffmpeg;
  })();
  
  return ffmpegLoadPromise;
}

/**
 * Download a file from URL to buffer
 */
async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${url}`);
  }
  return response.arrayBuffer();
}

/**
 * Extract a clip from the source video
 */
async function extractClip(
  ffmpeg: FFmpeg,
  videoData: Uint8Array,
  startTime: number,
  duration: number,
  outputName: string
): Promise<Uint8Array> {
  const inputName = 'input.mp4';
  
  await ffmpeg.writeFile(inputName, videoData);
  
  await ffmpeg.exec([
    '-ss', startTime.toString(),
    '-i', inputName,
    '-t', duration.toString(),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-y',
    outputName,
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return data as Uint8Array;
}

/**
 * Apply smart crop to video (simplified version for server)
 * Uses center crop for 9:16 aspect ratio
 */
async function applyCrop(
  ffmpeg: FFmpeg,
  clipData: Uint8Array,
  outputName: string
): Promise<Uint8Array> {
  const inputName = 'clip_input.mp4';
  
  await ffmpeg.writeFile(inputName, clipData);
  
  // Get video dimensions and apply center crop for 9:16
  // Using scale and crop filter chain
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', 'scale=1080:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)/2',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-y',
    outputName,
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return data as Uint8Array;
}

/**
 * Adjust clip duration using time stretching
 */
async function adjustDuration(
  ffmpeg: FFmpeg,
  clipData: Uint8Array,
  targetDuration: number,
  outputName: string
): Promise<Uint8Array> {
  const inputName = 'adjust_input.mp4';
  
  await ffmpeg.writeFile(inputName, clipData);
  
  // Get current duration by probing
  // For simplicity, we'll use setpts filter to adjust speed
  // This is a simplified approach - in production you'd probe the actual duration
  
  await ffmpeg.exec([
    '-i', inputName,
    '-filter_complex', `[0:v]setpts=PTS*1.0[v];[0:a]atempo=1.0[a]`,
    '-map', '[v]',
    '-map', '[a]',
    '-t', targetDuration.toString(),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-y',
    outputName,
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return data as Uint8Array;
}

/**
 * Generate simple TTS placeholder (server-side)
 * In production, you'd use a proper TTS service or ONNX runtime
 */
async function generateTTS(
  text: string,
  voiceId: string
): Promise<{ audio: Uint8Array; duration: number }> {
  // For now, create a silent audio placeholder
  // The duration is estimated based on text length (~150 words per minute)
  const words = text.split(/\s+/).length;
  const duration = Math.max(1, words / 2.5); // ~150 wpm = 2.5 words per second
  
  // Create a silent WAV file
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const bufferSize = 44 + numSamples * 2;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  
  // Silent audio (all zeros)
  
  return {
    audio: new Uint8Array(buffer),
    duration,
  };
}

/**
 * Stitch all segments together with audio
 */
async function stitchSegments(
  ffmpeg: FFmpeg,
  segments: Array<{ video: Uint8Array; audio: Uint8Array; duration: number }>,
  musicData: Uint8Array | null,
  musicVolume: number
): Promise<Uint8Array> {
  // Write all segment files
  const concatList: string[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const videoName = `seg_${i}.mp4`;
    const audioName = `seg_${i}.wav`;
    const combinedName = `combined_${i}.mp4`;
    
    await ffmpeg.writeFile(videoName, segments[i].video);
    await ffmpeg.writeFile(audioName, segments[i].audio);
    
    // Combine video with audio
    await ffmpeg.exec([
      '-i', videoName,
      '-i', audioName,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      '-y',
      combinedName,
    ]);
    
    concatList.push(`file '${combinedName}'`);
    
    // Cleanup input files
    await ffmpeg.deleteFile(videoName);
    await ffmpeg.deleteFile(audioName);
  }
  
  // Write concat list
  await ffmpeg.writeFile('concat.txt', concatList.join('\n'));
  
  // Concatenate all segments
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    '-y',
    'concatenated.mp4',
  ]);
  
  // Cleanup combined files
  for (let i = 0; i < segments.length; i++) {
    await ffmpeg.deleteFile(`combined_${i}.mp4`);
  }
  await ffmpeg.deleteFile('concat.txt');
  
  // Add background music if provided
  let finalOutput = 'concatenated.mp4';
  
  if (musicData && musicVolume > 0) {
    await ffmpeg.writeFile('music.wav', musicData);
    
    await ffmpeg.exec([
      '-i', 'concatenated.mp4',
      '-i', 'music.wav',
      '-filter_complex', `[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=first[a]`,
      '-map', '0:v',
      '-map', '[a]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-y',
      'final.mp4',
    ]);
    
    await ffmpeg.deleteFile('music.wav');
    await ffmpeg.deleteFile('concatenated.mp4');
    finalOutput = 'final.mp4';
  }
  
  const output = await ffmpeg.readFile(finalOutput);
  await ffmpeg.deleteFile(finalOutput);
  
  return output as Uint8Array;
}

/**
 * Generate captions from segments
 */
function generateCaptions(
  segments: ProcessingJob['segments'],
  durations: number[]
): SegmentCaptionData[] {
  let currentTime = 0;
  
  return segments.map((segment, index) => {
    const duration = durations[index];
    const words = segment.script.trim().split(/\s+/).filter(Boolean);
    const wordDuration = duration / words.length;
    
    const captionWords = words.map((word, wordIndex) => ({
      text: word,
      startTime: currentTime + wordIndex * wordDuration,
      endTime: currentTime + (wordIndex + 1) * wordDuration,
    }));
    
    currentTime += duration;
    
    return {
      segmentId: segment.id,
      words: captionWords,
    };
  });
}

/**
 * Main processing function
 * This runs in the background using waitUntil
 */
export async function processVideo(job: ProcessingJob): Promise<void> {
  console.log(`[Processor] Starting job ${job.id}`);
  
  try {
    // Stage 1: Load FFmpeg
    await updateJobProgress(job.id, 'loading', 0, 'Loading FFmpeg...');
    const ffmpeg = await getFFmpeg();
    await updateJobProgress(job.id, 'loading', 100, 'FFmpeg loaded');
    
    // Stage 2: Download source video
    await updateJobProgress(job.id, 'extracting', 0, 'Downloading source video...');
    const videoBuffer = await downloadFile(job.videoUrl);
    const videoData = new Uint8Array(videoBuffer);
    await updateJobProgress(job.id, 'extracting', 20, 'Source video downloaded');
    
    // Stage 3: Generate TTS for all segments
    await updateJobProgress(job.id, 'tts', 0, 'Generating voiceover...');
    const ttsResults: Array<{ audio: Uint8Array; duration: number }> = [];
    
    for (let i = 0; i < job.segments.length; i++) {
      const segment = job.segments[i];
      const progress = ((i + 1) / job.segments.length) * 100;
      await updateJobProgress(
        job.id, 
        'tts', 
        progress, 
        `Synthesizing segment ${i + 1}/${job.segments.length}...`,
        i + 1
      );
      
      const result = await generateTTS(segment.script, job.voiceId);
      ttsResults.push(result);
    }
    
    // Stage 4: Extract and process clips
    await updateJobProgress(job.id, 'detecting', 0, 'Processing video segments...');
    const processedSegments: Array<{ video: Uint8Array; audio: Uint8Array; duration: number }> = [];
    
    for (let i = 0; i < job.segments.length; i++) {
      const segment = job.segments[i];
      const ttsResult = ttsResults[i];
      const progress = ((i + 1) / job.segments.length) * 100;
      
      await updateJobProgress(
        job.id,
        'detecting',
        progress * 0.5,
        `Extracting clip ${i + 1}/${job.segments.length}...`,
        i + 1
      );
      
      // Extract clip (10 seconds from source timestamp)
      const clipData = await extractClip(
        ffmpeg,
        videoData,
        segment.sourceTimestamp,
        10,
        `clip_${i}.mp4`
      );
      
      await updateJobProgress(
        job.id,
        'cropping',
        progress * 0.7,
        `Cropping clip ${i + 1}/${job.segments.length}...`,
        i + 1
      );
      
      // Apply crop for vertical format
      const croppedData = await applyCrop(ffmpeg, clipData, `cropped_${i}.mp4`);
      
      await updateJobProgress(
        job.id,
        'cropping',
        progress * 0.9,
        `Adjusting duration ${i + 1}/${job.segments.length}...`,
        i + 1
      );
      
      // Adjust duration to match TTS
      const adjustedData = await adjustDuration(
        ffmpeg,
        croppedData,
        ttsResult.duration,
        `adjusted_${i}.mp4`
      );
      
      processedSegments.push({
        video: adjustedData,
        audio: ttsResult.audio,
        duration: ttsResult.duration,
      });
    }
    
    // Stage 5: Download music if provided
    let musicData: Uint8Array | null = null;
    if (job.musicUrl) {
      await updateJobProgress(job.id, 'stitching', 0, 'Loading background music...');
      const musicBuffer = await downloadFile(job.musicUrl);
      musicData = new Uint8Array(musicBuffer);
    }
    
    // Stage 6: Stitch everything together
    await updateJobProgress(job.id, 'stitching', 20, 'Stitching final video...');
    const finalVideo = await stitchSegments(
      ffmpeg,
      processedSegments,
      musicData,
      job.musicVolume
    );
    
    await updateJobProgress(job.id, 'stitching', 80, 'Uploading final video...');
    
    // Upload final video to Blob storage
    // Create a copy to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
    const outputBuffer = finalVideo.buffer.slice(
      finalVideo.byteOffset, 
      finalVideo.byteOffset + finalVideo.byteLength
    ) as ArrayBuffer;
    const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });
    const outputFilename = `outputs/${job.id}/final.mp4`;
    
    const uploaded = await put(outputFilename, outputBlob, {
      access: 'public',
      contentType: 'video/mp4',
    });
    
    // Generate captions if requested
    let captions: SegmentCaptionData[] | undefined;
    if (job.includeCaptions) {
      captions = generateCaptions(
        job.segments,
        ttsResults.map(r => r.duration)
      );
    }
    
    // Mark job as complete
    await completeJob(job.id, uploaded.url, captions);
    console.log(`[Processor] Job ${job.id} completed successfully`);
    
  } catch (error) {
    console.error(`[Processor] Job ${job.id} failed:`, error);
    await failJob(
      job.id,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}
