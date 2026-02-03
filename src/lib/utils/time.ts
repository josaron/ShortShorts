/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestamp(timestamp: string): number | null {
  if (!timestamp) return null;

  // Remove brackets if present
  const cleaned = timestamp.replace(/[\[\]]/g, '').trim();

  // Match MM:SS or HH:MM:SS format
  const parts = cleaned.split(':').map((p) => parseInt(p, 10));

  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Try parsing as plain number (seconds)
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format seconds to MM:SS or HH:MM:SS string
 */
export function formatTimestamp(seconds: number, includeHours = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (includeHours || h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Calculate estimated TTS duration based on word count
 * Average speaking rate: ~150 words per minute
 */
export function estimateTTSDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerSecond = 150 / 60; // 2.5 words per second
  return Math.max(1, words / wordsPerSecond);
}
