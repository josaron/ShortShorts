import type { CaptionWord, SegmentCaptions, ScriptSegment } from '@/types';

/**
 * Estimate word timings for a segment
 * Uses character-weighted distribution for more natural timing
 */
export function estimateWordTimings(
  text: string,
  startTime: number,
  duration: number
): CaptionWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    return [];
  }

  // Calculate total "weight" based on character count + pause weight
  const weights = words.map((word) => {
    let weight = word.length;
    
    // Add pause weight for punctuation
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      weight += 3; // Longer pause at sentence end
    } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
      weight += 1.5; // Medium pause at clause break
    }
    
    return weight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const timePerWeight = duration / totalWeight;

  const timings: CaptionWord[] = [];
  let currentTime = startTime;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = weights[i] * timePerWeight;
    
    timings.push({
      text: words[i],
      startTime: currentTime,
      endTime: currentTime + wordDuration,
    });
    
    currentTime += wordDuration;
  }

  // Ensure last word ends exactly at segment end
  if (timings.length > 0) {
    timings[timings.length - 1].endTime = startTime + duration;
  }

  return timings;
}

/**
 * Generate captions for all segments
 */
export function generateCaptions(
  segments: ScriptSegment[],
  durations: number[]
): SegmentCaptions[] {
  const captions: SegmentCaptions[] = [];
  let cumulativeTime = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const duration = durations[i] || 3; // Default 3 seconds

    const words = estimateWordTimings(segment.script, cumulativeTime, duration);
    
    captions.push({
      segmentId: segment.id,
      words,
    });

    cumulativeTime += duration;
  }

  return captions;
}

/**
 * Get the current word to highlight based on playback time
 */
export function getCurrentWord(
  captions: SegmentCaptions[],
  currentTime: number
): CaptionWord | null {
  for (const segment of captions) {
    for (const word of segment.words) {
      if (currentTime >= word.startTime && currentTime < word.endTime) {
        return word;
      }
    }
  }
  return null;
}

/**
 * Get visible caption text with highlighting info for current time
 */
export function getVisibleCaption(
  captions: SegmentCaptions[],
  currentTime: number,
  windowSize: number = 6 // Number of words to show
): { words: CaptionWord[]; currentWordIndex: number } | null {
  // Find current word
  let currentSegmentIndex = -1;
  let currentWordIndex = -1;

  for (let s = 0; s < captions.length; s++) {
    for (let w = 0; w < captions[s].words.length; w++) {
      const word = captions[s].words[w];
      if (currentTime >= word.startTime && currentTime < word.endTime) {
        currentSegmentIndex = s;
        currentWordIndex = w;
        break;
      }
    }
    if (currentWordIndex >= 0) break;
  }

  if (currentSegmentIndex < 0 || currentWordIndex < 0) {
    return null;
  }

  // Get window of words around current word
  const allWords: CaptionWord[] = captions.flatMap((s) => s.words);
  const flatCurrentIndex = captions
    .slice(0, currentSegmentIndex)
    .reduce((sum, s) => sum + s.words.length, 0) + currentWordIndex;

  const start = Math.max(0, flatCurrentIndex - Math.floor(windowSize / 2));
  const end = Math.min(allWords.length, start + windowSize);
  
  const words = allWords.slice(start, end);
  const relativeIndex = flatCurrentIndex - start;

  return {
    words,
    currentWordIndex: relativeIndex,
  };
}

/**
 * Format caption text for display
 */
export function formatCaptionText(words: CaptionWord[], currentIndex: number): string {
  return words.map((w, i) => {
    if (i === currentIndex) {
      return `<mark>${w.text}</mark>`;
    }
    return w.text;
  }).join(' ');
}
