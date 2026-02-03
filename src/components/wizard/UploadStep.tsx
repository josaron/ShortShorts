'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { FileDropzone, ScriptTable, MusicSelector, VoiceSelector, Button } from '@/components/ui';
import { formatDuration, estimateTTSDuration } from '@/lib/utils/time';

export function UploadStep() {
  const {
    project,
    setVideoFile,
    clearVideoFile,
    setSegments,
    setVoice,
    setMusic,
    setMusicVolume,
    setIncludeCaptions,
    nextStep,
  } = useProjectStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'video' | 'script' | 'voice' | 'music' | 'options'>('video');

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const handleVideoSelect = useCallback(
    async (file: File) => {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);

      // Get video duration
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        setVideoFile(file, video.duration);
      };
      video.onerror = () => {
        // If we can't get duration, still set the file
        setVideoFile(file, 0);
      };
    },
    [setVideoFile]
  );

  const handleClearVideo = useCallback(() => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    clearVideoFile();
  }, [videoPreviewUrl, clearVideoFile]);

  // Calculate estimated total duration
  const estimatedDuration = project.segments.reduce(
    (acc, seg) => acc + (seg.ttsDuration || estimateTTSDuration(seg.script)),
    0
  );

  // Validation checks
  const isValid =
    project.videoFile &&
    project.segments.length > 0 &&
    project.selectedVoice &&
    project.segments.every((seg) => seg.script.trim().length > 0);

  const durationWarning =
    estimatedDuration < 45
      ? 'Short may be under 45 seconds'
      : estimatedDuration > 75
      ? 'Short may exceed 75 seconds'
      : null;

  return (
    <div className="space-y-8">
      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap border-b border-[var(--border)] pb-4">
        {[
          { id: 'video', label: 'Video', icon: '📹' },
          { id: 'script', label: 'Script', icon: '📝' },
          { id: 'voice', label: 'Voice', icon: '🎙️' },
          { id: 'music', label: 'Music', icon: '🎵' },
          { id: 'options', label: 'Options', icon: '⚙️' },
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as typeof activeSection)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
              ${
                activeSection === section.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }
            `}
          >
            <span>{section.icon}</span>
            {section.label}
            {section.id === 'video' && project.videoFile && (
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            )}
            {section.id === 'script' && project.segments.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            )}
            {section.id === 'voice' && project.selectedVoice && (
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            )}
          </button>
        ))}
      </div>

      {/* Video section */}
      {activeSection === 'video' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Upload Source Video
            </h2>
            <p className="text-[var(--text-secondary)]">
              Upload the long-form video you want to create a short from.
            </p>
          </div>

          {!project.videoFile ? (
            <FileDropzone
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onFileSelect={handleVideoSelect}
              maxSize={2 * 1024 * 1024 * 1024} // 2GB
            />
          ) : (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-4">
              {/* Video preview */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoPreviewUrl || undefined}
                  className="w-full h-full object-contain"
                  controls
                  muted
                />
              </div>

              {/* Video info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-md">
                    {project.videoFile.name}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {(project.videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    {project.videoDuration && ` • ${formatDuration(project.videoDuration)}`}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleClearVideo}>
                  Change Video
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Script section */}
      {activeSection === 'script' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Script & Timestamps
            </h2>
            <p className="text-[var(--text-secondary)]">
              Paste your Gemini-generated script with footage timestamps. Each row defines a segment of your short.
            </p>
          </div>

          <ScriptTable
            segments={project.segments}
            onSegmentsChange={setSegments}
            videoDuration={project.videoDuration}
          />
        </div>
      )}

      {/* Voice section */}
      {activeSection === 'voice' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Select Voice
            </h2>
            <p className="text-[var(--text-secondary)]">
              Choose the voice that will narrate your short. All voices are processed locally using Piper TTS.
            </p>
          </div>

          <VoiceSelector
            selectedVoice={project.selectedVoice}
            onSelectVoice={setVoice}
          />
        </div>
      )}

      {/* Music section */}
      {activeSection === 'music' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Background Music
            </h2>
            <p className="text-[var(--text-secondary)]">
              Add optional background music to enhance your short. All tracks are royalty-free.
            </p>
          </div>

          <MusicSelector
            selectedTrack={project.selectedMusic}
            onSelectTrack={setMusic}
            volume={project.musicVolume}
            onVolumeChange={setMusicVolume}
          />
        </div>
      )}

      {/* Options section */}
      {activeSection === 'options' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Additional Options
            </h2>
            <p className="text-[var(--text-secondary)]">
              Configure captions and other settings for your short.
            </p>
          </div>

          {/* Captions toggle */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  On-Screen Captions
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Display word-by-word highlighted captions during playback
                </p>
              </div>
              <button
                onClick={() => setIncludeCaptions(!project.includeCaptions)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${project.includeCaptions ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${project.includeCaptions ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {project.includeCaptions && (
              <div className="pt-4 border-t border-[var(--border)] space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Caption Position
                  </label>
                  <div className="flex gap-2">
                    {['top', 'center', 'bottom'].map((pos) => (
                      <button
                        key={pos}
                        onClick={() =>
                          useProjectStore.getState().setCaptionStyle({
                            position: pos as 'top' | 'center' | 'bottom',
                          })
                        }
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                          ${
                            project.captionStyle.position === pos
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--border)]'
                          }
                        `}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Font Size
                  </label>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large'].map((size) => (
                      <button
                        key={size}
                        onClick={() =>
                          useProjectStore.getState().setCaptionStyle({
                            fontSize: size as 'small' | 'medium' | 'large',
                          })
                        }
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                          ${
                            project.captionStyle.fontSize === size
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--border)]'
                          }
                        `}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary and proceed */}
      <div className="bg-gradient-to-r from-[var(--accent-soft)]/10 to-[var(--bg-secondary)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)]">Summary</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)]">Video</p>
            <p className="font-medium text-[var(--text-primary)]">
              {project.videoFile ? 'Uploaded' : 'Not uploaded'}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Segments</p>
            <p className="font-medium text-[var(--text-primary)]">
              {project.segments.length}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Est. Duration</p>
            <p
              className={`font-medium ${
                durationWarning ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {formatDuration(estimatedDuration)}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Voice</p>
            <p className="font-medium text-[var(--text-primary)]">
              {project.selectedVoice?.name || 'Not selected'}
            </p>
          </div>
        </div>

        {durationWarning && (
          <p className="text-sm text-[var(--warning)] flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {durationWarning}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            disabled={!isValid}
            onClick={nextStep}
          >
            Continue to Processing
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
