import { loadVoice, synthesize, getSampleRate, isVoiceLoaded } from './client';
import type { Voice, CaptionWord } from '@/types';

/**
 * Convert Float32Array audio data to WAV Blob
 * @param audioData - Raw audio samples
 * @param sampleRate - Sample rate in Hz
 * @returns WAV file as Blob
 */
export function audioToWav(audioData: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

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
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Audio data
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    // Convert float to 16-bit integer
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Synthesize text to audio file
 * @param text - Text to synthesize
 * @param voice - Voice to use
 * @returns Audio as Blob and duration
 */
export async function synthesizeText(
  text: string,
  voice: Voice
): Promise<{ audio: Blob; duration: number }> {
  // Ensure voice is loaded
  await loadVoice(voice);

  // Synthesize audio
  const audioData = await synthesize(text);
  const sampleRate = getSampleRate();
  const duration = audioData.length / sampleRate;

  // Convert to WAV
  const audioBlob = audioToWav(audioData, sampleRate);

  return { audio: audioBlob, duration };
}

/**
 * Synthesize multiple text segments
 * @param texts - Array of texts to synthesize
 * @param voice - Voice to use
 * @param onProgress - Progress callback
 * @returns Array of audio blobs with durations
 */
export async function synthesizeMultiple(
  texts: string[],
  voice: Voice,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ audio: Blob; duration: number }>> {
  const results: Array<{ audio: Blob; duration: number }> = [];

  // Ensure voice is loaded
  await loadVoice(voice);

  for (let i = 0; i < texts.length; i++) {
    const result = await synthesizeText(texts[i], voice);
    results.push(result);
    onProgress?.(i + 1, texts.length);
  }

  return results;
}

/**
 * Estimate word timings for caption display
 * This is a fallback when Piper doesn't provide phoneme timing
 * @param text - Text that was synthesized
 * @param duration - Total audio duration
 * @returns Array of word timings
 */
export function estimateWordTimings(text: string, duration: number): CaptionWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    return [];
  }

  // Calculate duration per word based on character count
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  const charsPerSecond = totalChars / duration;

  const timings: CaptionWord[] = [];
  let currentTime = 0;

  for (const word of words) {
    const wordDuration = word.length / charsPerSecond;
    timings.push({
      text: word,
      startTime: currentTime,
      endTime: currentTime + wordDuration,
    });
    currentTime += wordDuration;
  }

  // Adjust last word to match total duration
  if (timings.length > 0) {
    timings[timings.length - 1].endTime = duration;
  }

  return timings;
}

/**
 * Get audio duration from blob
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio'));
    };

    audio.src = url;
  });
}
