'use client';

import { useState, useRef, useEffect } from 'react';
import type { MusicTrack } from '@/types';
import { formatDuration } from '@/lib/utils/time';

// Available music tracks (bundled in public/music)
export const MUSIC_TRACKS: MusicTrack[] = [
  // Upbeat/Energetic
  { id: 'upbeat-1', name: 'Energetic Rise', category: 'upbeat', duration: 120, filePath: '/music/upbeat-1.wav' },
  { id: 'upbeat-2', name: 'Positive Vibes', category: 'upbeat', duration: 90, filePath: '/music/upbeat-2.wav' },
  { id: 'upbeat-3', name: 'Happy Days', category: 'upbeat', duration: 105, filePath: '/music/upbeat-3.wav' },
  // Calm/Ambient
  { id: 'calm-1', name: 'Peaceful Journey', category: 'calm', duration: 150, filePath: '/music/calm-1.wav' },
  { id: 'calm-2', name: 'Gentle Breeze', category: 'calm', duration: 120, filePath: '/music/calm-2.wav' },
  { id: 'calm-3', name: 'Soft Focus', category: 'calm', duration: 135, filePath: '/music/calm-3.wav' },
  // Dramatic/Epic
  { id: 'dramatic-1', name: 'Epic Discovery', category: 'dramatic', duration: 90, filePath: '/music/dramatic-1.wav' },
  { id: 'dramatic-2', name: 'Tension Build', category: 'dramatic', duration: 105, filePath: '/music/dramatic-2.wav' },
  { id: 'dramatic-3', name: 'Cinematic Rise', category: 'dramatic', duration: 120, filePath: '/music/dramatic-3.wav' },
  // Mystery/Curious
  { id: 'mystery-1', name: 'Curious Mind', category: 'mystery', duration: 110, filePath: '/music/mystery-1.wav' },
  { id: 'mystery-2', name: 'Hidden Secrets', category: 'mystery', duration: 95, filePath: '/music/mystery-2.wav' },
  { id: 'mystery-3', name: 'Strange Tales', category: 'mystery', duration: 100, filePath: '/music/mystery-3.wav' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'calm', label: 'Calm' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'mystery', label: 'Mystery' },
] as const;

interface MusicSelectorProps {
  selectedTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack | null) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function MusicSelector({
  selectedTrack,
  onSelectTrack,
  volume,
  onVolumeChange,
}: MusicSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTracks =
    activeCategory === 'all'
      ? MUSIC_TRACKS
      : MUSIC_TRACKS.filter((t) => t.category === activeCategory);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePreview = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      // Start playing new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.filePath);
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {
        // Audio might not exist yet in development
        console.log('Audio preview not available');
      });
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">
          Background Music
        </h3>
        {selectedTrack && (
          <button
            onClick={() => onSelectTrack(null)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--error)]"
          >
            Remove music
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                activeCategory === cat.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            onClick={() => onSelectTrack(track)}
            className={`
              flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
              ${
                selectedTrack?.id === track.id
                  ? 'bg-[var(--accent-soft)]/20 border-2 border-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] border-2 border-transparent hover:border-[var(--border)]'
              }
            `}
          >
            {/* Preview button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(track);
              }}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${
                  playingTrackId === track.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-white text-[var(--accent)]'
                }
              `}
            >
              {playingTrackId === track.id ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)] truncate">
                {track.name}
              </p>
              <p className="text-xs text-[var(--text-muted)] capitalize">
                {track.category} - {formatDuration(track.duration)}
              </p>
            </div>

            {/* Selected indicator */}
            {selectedTrack?.id === track.id && (
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

      {/* Volume control */}
      {selectedTrack && (
        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
              className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[var(--accent)]
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-sm text-[var(--text-secondary)] w-10 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Music will be mixed at {Math.round(volume * 100)}% volume under the voiceover
          </p>
        </div>
      )}
    </div>
  );
}
