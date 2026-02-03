'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button, VideoPlayer } from '@/components/ui';
import { WordHighlight } from '@/components/captions';
import { formatDuration } from '@/lib/utils/time';

export function PreviewStep() {
  const {
    project,
    prevStep,
    resetProject,
  } = useProjectStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleExport = useCallback(async () => {
    if (!project.outputVideo) return;

    setIsExporting(true);

    try {
      // Create download link
      const url = URL.createObjectURL(project.outputVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_short.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [project.outputVideo, project.name]);

  const handleStartOver = useCallback(() => {
    if (confirm('Are you sure you want to start over? This will clear your current project.')) {
      resetProject();
    }
  }, [resetProject]);

  if (!project.outputVideo) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          No Video Available
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please complete the processing step first.
        </p>
        <Button onClick={prevStep}>
          Go to Processing
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Preview Your Short
        </h2>
        <p className="text-[var(--text-secondary)]">
          Review your video and export when ready
        </p>
      </div>

      {/* Video player */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          <VideoPlayer
            src={project.outputVideo}
            aspectRatio="9:16"
            showControls={true}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            muted={false}
            overlay={
              project.includeCaptions && project.captions.length > 0 ? (
                <WordHighlight
                  captions={project.captions}
                  currentTime={currentTime}
                  style={project.captionStyle}
                  isVisible={true}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Video info */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">Video Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)]">Duration</p>
            <p className="font-medium text-[var(--text-primary)]">
              {formatDuration(duration)}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Resolution</p>
            <p className="font-medium text-[var(--text-primary)]">
              720 x 1280
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Format</p>
            <p className="font-medium text-[var(--text-primary)]">
              MP4 (H.264)
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Size</p>
            <p className="font-medium text-[var(--text-primary)]">
              {(project.outputVideo.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Segments</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.segments.length}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Voice</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.selectedVoice?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Music</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.selectedMusic?.name || 'None'}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Captions</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.includeCaptions ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export success message */}
      {exportSuccess && (
        <div className="bg-[var(--success-soft)] border border-[var(--success)] rounded-xl p-4 flex items-center gap-3">
          <svg
            className="w-6 h-6 text-[var(--success)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium text-[var(--success)]">
              Export Successful!
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Your video has been downloaded.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={prevStep}>
            Back to Processing
          </Button>
          <Button variant="ghost" onClick={handleStartOver}>
            Start Over
          </Button>
        </div>

        <Button
          size="lg"
          onClick={handleExport}
          isLoading={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
          {!isExporting && (
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-[var(--accent-soft)]/10 rounded-xl p-6 space-y-3">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[var(--accent)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Tips for Your Short
        </h3>
        <ul className="text-sm text-[var(--text-secondary)] space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent)]">•</span>
            Upload to YouTube Shorts, Instagram Reels, or TikTok for best results
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent)]">•</span>
            Add relevant hashtags and an engaging title for discoverability
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent)]">•</span>
            Consider adding a call-to-action in your video description
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--accent)]">•</span>
            Optimal posting times vary by platform - test different schedules
          </li>
        </ul>
      </div>
    </div>
  );
}
