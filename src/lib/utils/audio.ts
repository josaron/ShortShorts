/**
 * Fetch audio file as ArrayBuffer
 */
export async function fetchAudioBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  return response.arrayBuffer();
}

/**
 * Convert ArrayBuffer to Blob
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, type: string): Blob {
  return new Blob([buffer], { type });
}

/**
 * Create an audio context (with fallback for older browsers)
 */
export function createAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioContextClass();
}

/**
 * Decode audio data from an ArrayBuffer
 */
export async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
  const context = createAudioContext();
  try {
    return await context.decodeAudioData(buffer);
  } finally {
    await context.close();
  }
}

/**
 * Get audio duration from a blob
 */
export function getAudioDuration(audioBlob: Blob): Promise<number> {
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

/**
 * Mix two audio buffers together
 */
export function mixAudioBuffers(
  primary: AudioBuffer,
  secondary: AudioBuffer,
  secondaryVolume: number = 0.15
): AudioBuffer {
  const context = new OfflineAudioContext(
    primary.numberOfChannels,
    primary.length,
    primary.sampleRate
  );

  const result = context.createBuffer(
    primary.numberOfChannels,
    primary.length,
    primary.sampleRate
  );

  for (let channel = 0; channel < primary.numberOfChannels; channel++) {
    const primaryData = primary.getChannelData(channel);
    const resultData = result.getChannelData(channel);
    
    // Get secondary channel (use first channel if secondary has fewer channels)
    const secondaryChannel = Math.min(channel, secondary.numberOfChannels - 1);
    const secondaryData = secondary.getChannelData(secondaryChannel);

    for (let i = 0; i < primaryData.length; i++) {
      const secondaryIndex = i % secondaryData.length; // Loop secondary if shorter
      resultData[i] = primaryData[i] + secondaryData[secondaryIndex] * secondaryVolume;
      
      // Clamp to prevent clipping
      resultData[i] = Math.max(-1, Math.min(1, resultData[i]));
    }
  }

  return result;
}
