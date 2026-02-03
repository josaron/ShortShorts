'use client';

import { useMemo } from 'react';
import type { SegmentCaptions, CaptionStyle, CaptionWord } from '@/types';
import { getVisibleCaption } from '@/lib/utils/captions';

interface WordHighlightProps {
  captions: SegmentCaptions[];
  currentTime: number;
  style: CaptionStyle;
  isVisible?: boolean;
}

export function WordHighlight({
  captions,
  currentTime,
  style,
  isVisible = true,
}: WordHighlightProps) {
  const visibleCaption = useMemo(() => {
    return getVisibleCaption(captions, currentTime, 8);
  }, [captions, currentTime]);

  if (!isVisible || !visibleCaption) {
    return null;
  }

  const { words, currentWordIndex } = visibleCaption;

  const positionClasses = {
    top: 'top-8',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-20',
  };

  const fontSizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <div
      className={`
        absolute left-0 right-0 px-6 pointer-events-none
        ${positionClasses[style.position]}
      `}
    >
      <div
        className={`
          mx-auto max-w-[90%] rounded-xl px-4 py-3 text-center
          ${fontSizeClasses[style.fontSize]}
          font-bold leading-relaxed
        `}
        style={{
          backgroundColor: style.backgroundColor,
          color: style.color,
        }}
      >
        {words.map((word, index) => (
          <span
            key={`${word.startTime}-${word.text}`}
            className={`
              inline-block mx-1 transition-all duration-100
              ${index === currentWordIndex ? 'scale-110' : 'opacity-80'}
            `}
            style={{
              color: index === currentWordIndex ? style.highlightColor : style.color,
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Animated caption with word-by-word reveal
 */
interface AnimatedCaptionProps {
  text: string;
  currentWord: number;
  totalWords: number;
  style: CaptionStyle;
}

export function AnimatedCaption({
  text,
  currentWord,
  totalWords,
  style,
}: AnimatedCaptionProps) {
  const words = text.split(/\s+/);

  const positionClasses = {
    top: 'top-8',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-20',
  };

  const fontSizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <div
      className={`
        absolute left-0 right-0 px-6 pointer-events-none
        ${positionClasses[style.position]}
      `}
    >
      <div
        className={`
          mx-auto max-w-[90%] rounded-xl px-4 py-3 text-center
          ${fontSizeClasses[style.fontSize]}
          font-bold leading-relaxed
        `}
        style={{
          backgroundColor: style.backgroundColor,
          color: style.color,
        }}
      >
        {words.map((word, index) => {
          const isHighlighted = index === currentWord;
          const isRevealed = index <= currentWord;

          return (
            <span
              key={index}
              className={`
                inline-block mx-1 transition-all duration-150
                ${isRevealed ? 'opacity-100' : 'opacity-40'}
                ${isHighlighted ? 'scale-110' : ''}
              `}
              style={{
                color: isHighlighted ? style.highlightColor : style.color,
                transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Preview component showing caption style options
 */
interface CaptionPreviewProps {
  style: CaptionStyle;
  sampleText?: string;
}

export function CaptionPreview({
  style,
  sampleText = 'This is how your captions will look',
}: CaptionPreviewProps) {
  const words = sampleText.split(/\s+/);
  const highlightedWord = Math.floor(words.length / 2);

  const positionClasses = {
    top: 'items-start pt-4',
    center: 'items-center',
    bottom: 'items-end pb-4',
  };

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <div
      className={`
        relative w-full aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden
        flex ${positionClasses[style.position]}
      `}
    >
      <div
        className={`
          w-full px-4 text-center
          ${fontSizeClasses[style.fontSize]}
          font-bold
        `}
      >
        <div
          className="inline-block rounded-lg px-3 py-2"
          style={{
            backgroundColor: style.backgroundColor,
            color: style.color,
          }}
        >
          {words.map((word, index) => (
            <span
              key={index}
              className="inline-block mx-0.5"
              style={{
                color: index === highlightedWord ? style.highlightColor : style.color,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
