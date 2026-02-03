import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Get or initialize the FFmpeg instance
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = initFFmpeg();
  return loadPromise;
}

/**
 * Initialize FFmpeg with WASM files
 */
async function initFFmpeg(): Promise<FFmpeg> {
  if (isLoading) {
    throw new Error('FFmpeg is already being loaded');
  }

  isLoading = true;

  try {
    ffmpeg = new FFmpeg();

    // Log FFmpeg messages for debugging
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // Load FFmpeg core from CDN - use UMD version for Turbopack compatibility
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    ffmpeg = null;
    throw error;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
}

/**
 * Check if FFmpeg is loaded
 */
export function isFFmpegLoaded(): boolean {
  return ffmpeg?.loaded ?? false;
}

/**
 * Write a file to FFmpeg's virtual filesystem
 */
export async function writeFile(name: string, data: File | Blob | ArrayBuffer | Uint8Array): Promise<void> {
  const ff = await getFFmpeg();
  
  if (data instanceof File || data instanceof Blob) {
    const arrayBuffer = await data.arrayBuffer();
    await ff.writeFile(name, new Uint8Array(arrayBuffer));
  } else if (data instanceof ArrayBuffer) {
    await ff.writeFile(name, new Uint8Array(data));
  } else {
    await ff.writeFile(name, data);
  }
}

/**
 * Read a file from FFmpeg's virtual filesystem
 */
export async function readFile(name: string): Promise<Uint8Array> {
  const ff = await getFFmpeg();
  const data = await ff.readFile(name);
  return data as Uint8Array;
}

/**
 * Delete a file from FFmpeg's virtual filesystem
 */
export async function deleteFile(name: string): Promise<void> {
  const ff = await getFFmpeg();
  try {
    await ff.deleteFile(name);
  } catch {
    // File might not exist, ignore
  }
}

/**
 * Execute an FFmpeg command
 */
export async function exec(args: string[]): Promise<void> {
  const ff = await getFFmpeg();
  await ff.exec(args);
}

/**
 * Convert Uint8Array to Blob
 */
export function toBlob(data: Uint8Array, type: string): Blob {
  // Create a copy to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type });
}

export { fetchFile };
