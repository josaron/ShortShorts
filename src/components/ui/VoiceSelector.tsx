'use client';

import { useState } from 'react';
import type { Voice } from '@/types';

// Available Piper voices (bundled in public/voices)
export const AVAILABLE_VOICES: Voice[] = [
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac',
    language: 'English (US)',
    gender: 'neutral',
    description: 'Clear, professional narrator voice',
    modelPath: '/voices/en_US-lessac-medium.onnx',
    configPath: '/voices/en_US-lessac-medium.onnx.json',
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy',
    language: 'English (US)',
    gender: 'female',
    description: 'Friendly female voice with natural tone',
    modelPath: '/voices/en_US-amy-medium.onnx',
    configPath: '/voices/en_US-amy-medium.onnx.json',
  },
  {
    id: 'en_US-ryan-medium',
    name: 'Ryan',
    language: 'English (US)',
    gender: 'male',
    description: 'Deep, authoritative male voice',
    modelPath: '/voices/en_US-ryan-medium.onnx',
    configPath: '/voices/en_US-ryan-medium.onnx.json',
  },
  {
    id: 'en_GB-alan-medium',
    name: 'Alan',
    language: 'English (UK)',
    gender: 'male',
    description: 'British accent with clear articulation',
    modelPath: '/voices/en_GB-alan-medium.onnx',
    configPath: '/voices/en_GB-alan-medium.onnx.json',
  },
];

interface VoiceSelectorProps {
  selectedVoice: Voice | null;
  onSelectVoice: (voice: Voice) => void;
  disabled?: boolean;
}

export function VoiceSelector({
  selectedVoice,
  onSelectVoice,
  disabled = false,
}: VoiceSelectorProps) {
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const handlePreview = async (voice: Voice) => {
    // In production, this would synthesize a sample
    // For now, we just show a loading state
    setPreviewingVoiceId(voice.id);
    
    // Simulate preview
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setPreviewingVoiceId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--text-primary)]">
        Voice Selection
      </h3>

      <div className="grid gap-3">
        {AVAILABLE_VOICES.map((voice) => (
          <div
            key={voice.id}
            onClick={() => !disabled && onSelectVoice(voice)}
            className={`
              flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${
                selectedVoice?.id === voice.id
                  ? 'bg-[var(--accent-soft)]/20 border-2 border-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] border-2 border-transparent hover:border-[var(--border)]'
              }
            `}
          >
            {/* Voice icon */}
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${
                  selectedVoice?.id === voice.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-white text-[var(--accent)]'
                }
              `}
            >
              {voice.gender === 'female' ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm6 10v8H6v-8h12z" />
                </svg>
              ) : voice.gender === 'male' ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
                  <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
                </svg>
              )}
            </div>

            {/* Voice info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {voice.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-muted)]">
                  {voice.language}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {voice.description}
              </p>
            </div>

            {/* Preview button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handlePreview(voice);
              }}
              disabled={disabled || previewingVoiceId === voice.id}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  previewingVoiceId === voice.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-white text-[var(--accent)] hover:bg-[var(--accent-soft)]/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {previewingVoiceId === voice.id ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Loading
                </span>
              ) : (
                'Preview'
              )}
            </button>

            {/* Selected indicator */}
            {selectedVoice?.id === voice.id && (
              <svg
                className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        Voice models are loaded on-demand when processing begins.
      </p>
    </div>
  );
}
