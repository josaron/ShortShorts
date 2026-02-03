import type { Voice } from '@/types';

/**
 * Available Piper TTS voices
 * These would be bundled in public/voices/ in production
 */
export const VOICES: Voice[] = [
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac',
    language: 'English (US)',
    gender: 'neutral',
    description: 'Clear, professional narrator voice. Great for educational content.',
    modelPath: '/voices/en_US-lessac-medium.onnx',
    configPath: '/voices/en_US-lessac-medium.onnx.json',
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy',
    language: 'English (US)',
    gender: 'female',
    description: 'Friendly female voice with natural, warm tone.',
    modelPath: '/voices/en_US-amy-medium.onnx',
    configPath: '/voices/en_US-amy-medium.onnx.json',
  },
  {
    id: 'en_US-ryan-medium',
    name: 'Ryan',
    language: 'English (US)',
    gender: 'male',
    description: 'Deep, authoritative male voice. Good for documentary style.',
    modelPath: '/voices/en_US-ryan-medium.onnx',
    configPath: '/voices/en_US-ryan-medium.onnx.json',
  },
  {
    id: 'en_GB-alan-medium',
    name: 'Alan',
    language: 'English (UK)',
    gender: 'male',
    description: 'British accent with clear articulation. Formal and engaging.',
    modelPath: '/voices/en_GB-alan-medium.onnx',
    configPath: '/voices/en_GB-alan-medium.onnx.json',
  },
];

/**
 * Get voice by ID
 */
export function getVoiceById(id: string): Voice | undefined {
  return VOICES.find((v) => v.id === id);
}

/**
 * Get voices by language
 */
export function getVoicesByLanguage(language: string): Voice[] {
  return VOICES.filter((v) => v.language.toLowerCase().includes(language.toLowerCase()));
}

/**
 * Get voices by gender
 */
export function getVoicesByGender(gender: Voice['gender']): Voice[] {
  return VOICES.filter((v) => v.gender === gender);
}

/**
 * Get default voice
 */
export function getDefaultVoice(): Voice {
  return VOICES[0];
}
