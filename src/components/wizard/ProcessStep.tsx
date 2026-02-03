'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui';
import type { JobStatusResponse } from '@/lib/server/types';

type ProcessingStage = 'uploading' | 'queued' | 'loading' | 'tts' | 'extracting' | 'detecting' | 'cropping' | 'stitching' | 'complete' | 'error';

interface ProcessingState {
  stage: ProcessingStage;
  currentSegment: number;
  totalSegments: number;
  progress: number;
  message: string;
  error?: string;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function ProcessStep() {
  const {
    project,
    serverProcessing,
    setProcessingProgress,
    setOutputUrl,
    setJobId,
    setVideoUrl,
    setCaptions,
    nextStep,
    prevStep,
  } = useProjectStore();

  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'uploading',
    currentSegment: 0,
    totalSegments: project.segments.length,
    progress: 0,
    message: 'Preparing to upload...',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const updateProgress = useCallback((updates: Partial<ProcessingState>) => {
    setProcessingState((prev) => ({ ...prev, ...updates }));
    setProcessingProgress({
      stage: updates.stage || processingState.stage,
      currentSegment: updates.currentSegment ?? processingState.currentSegment,
      totalSegments: updates.totalSegments ?? processingState.totalSegments,
      stageProgress: updates.progress ?? processingState.progress,
      message: updates.message ?? processingState.message,
    });
  }, [processingState, setProcessingProgress]);

  /**
   * Upload video to Vercel Blob storage
   */
  const uploadVideo = async (): Promise<string> => {
    if (!project.videoFile) {
      throw new Error('No video file to upload');
    }

    // Check if already uploaded
    if (serverProcessing.videoUrl) {
      return serverProcessing.videoUrl;
    }

    updateProgress({
      stage: 'uploading',
      progress: 10,
      message: 'Uploading video...',
    });

    const formData = new FormData();
    formData.append('file', project.videoFile);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload video');
    }

    const result = await response.json();
    setVideoUrl(result.url);

    updateProgress({
      stage: 'uploading',
      progress: 100,
      message: 'Video uploaded',
    });

    return result.url;
  };

  /**
   * Start the processing job on the server
   */
  const startProcessing = async (videoUrl: string): Promise<string> => {
    updateProgress({
      stage: 'queued',
      progress: 0,
      message: 'Starting processing job...',
    });

    const requestBody = {
      videoUrl,
      segments: project.segments.map((seg) => ({
        id: seg.id,
        script: seg.script,
        sourceTimestamp: seg.sourceTimestamp,
        outputTime: seg.outputTime,
      })),
      voiceId: project.selectedVoice?.id || 'en_US-lessac-medium',
      musicUrl: project.selectedMusic?.filePath 
        ? `${window.location.origin}${project.selectedMusic.filePath}`
        : undefined,
      musicVolume: project.musicVolume,
      includeCaptions: project.includeCaptions,
    };

    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start processing');
    }

    const result = await response.json();
    setJobId(result.jobId);

    return result.jobId;
  };

  /**
   * Poll for job status
   */
  const pollJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
    const response = await fetch(`/api/status/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job status');
    }

    return response.json();
  };

  /**
   * Main processing flow
   */
  const processVideo = useCallback(async () => {
    if (!project.videoFile || !project.selectedVoice || project.segments.length === 0) {
      updateProgress({
        stage: 'error',
        message: 'Missing required data',
        error: 'Please ensure video, voice, and script are configured.',
      });
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // Step 1: Upload video
      const videoUrl = await uploadVideo();

      // Step 2: Start processing job
      const jobId = await startProcessing(videoUrl);

      // Step 3: Poll for completion
      const pollForCompletion = async () => {
        try {
          const status = await pollJobStatus(jobId);

          // Update UI with server status
          updateProgress({
            stage: status.stage as ProcessingStage,
            currentSegment: status.currentSegment,
            totalSegments: status.totalSegments,
            progress: status.progress,
            message: status.message,
            error: status.error,
          });

          if (status.status === 'complete') {
            // Processing complete
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            // Save output URL
            if (status.outputUrl) {
              setOutputUrl(status.outputUrl);
            }

            // Save captions if provided
            if (status.captions) {
              setCaptions(status.captions.map((c) => ({
                segmentId: c.segmentId,
                words: c.words,
              })));
            }

            updateProgress({
              stage: 'complete',
              progress: 100,
              message: 'Video processing complete!',
            });

            setIsProcessing(false);
            processingRef.current = false;

          } else if (status.status === 'error') {
            // Processing failed
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            updateProgress({
              stage: 'error',
              message: 'Processing failed',
              error: status.error || 'Unknown error occurred',
            });

            setIsProcessing(false);
            processingRef.current = false;
          }
          // Otherwise continue polling
        } catch (error) {
          console.error('Polling error:', error);
          // Don't stop polling on transient errors
        }
      };

      // Start polling
      pollingRef.current = setInterval(pollForCompletion, POLL_INTERVAL);
      // Also poll immediately
      await pollForCompletion();

    } catch (error) {
      console.error('Processing error:', error);
      updateProgress({
        stage: 'error',
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [project, serverProcessing, updateProgress, setOutputUrl, setJobId, setVideoUrl, setCaptions]);

  // Start processing automatically
  useEffect(() => {
    if (!isProcessing && processingState.stage === 'uploading' && !processingRef.current) {
      processVideo();
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const getStageInfo = (stage: ProcessingStage) => {
    const stages: Record<ProcessingStage, { label: string; icon: string }> = {
      uploading: { label: 'Uploading Video', icon: '⬆️' },
      queued: { label: 'Queued', icon: '⏳' },
      loading: { label: 'Loading Libraries', icon: '⚙️' },
      tts: { label: 'Generating Voiceover', icon: '🎙️' },
      extracting: { label: 'Extracting Clips', icon: '🎬' },
      detecting: { label: 'Detecting Faces', icon: '🔍' },
      cropping: { label: 'Smart Cropping', icon: '✂️' },
      stitching: { label: 'Stitching Video', icon: '🎞️' },
      complete: { label: 'Complete', icon: '✅' },
      error: { label: 'Error', icon: '❌' },
    };
    return stages[stage];
  };

  const stageInfo = getStageInfo(processingState.stage);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          {processingState.stage === 'complete'
            ? 'Processing Complete!'
            : processingState.stage === 'error'
            ? 'Processing Failed'
            : 'Processing Your Short'}
        </h2>
        <p className="text-[var(--text-secondary)]">
          {processingState.stage === 'complete'
            ? 'Your short video is ready for preview'
            : processingState.stage === 'error'
            ? 'An error occurred during processing'
            : 'Processing on Vercel Fluid Compute'}
        </p>
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-8 space-y-6">
        {/* Current stage indicator */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">{stageInfo.icon}</span>
          <div>
            <p className="text-xl font-medium text-[var(--text-primary)]">
              {stageInfo.label}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {processingState.message}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {processingState.stage !== 'error' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                {processingState.stage !== 'complete' && processingState.currentSegment > 0
                  ? `Segment ${processingState.currentSegment} of ${processingState.totalSegments}`
                  : 'Progress'}
              </span>
              <span className="font-medium text-[var(--accent)]">
                {Math.round(processingState.progress)}%
              </span>
            </div>
            <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  processingState.stage === 'complete'
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--accent)]'
                }`}
                style={{ width: `${processingState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stage timeline */}
        {processingState.stage !== 'error' && (
          <div className="grid grid-cols-6 gap-2 pt-4 border-t border-[var(--border)]">
            {(['uploading', 'tts', 'extracting', 'detecting', 'stitching', 'complete'] as ProcessingStage[]).map(
              (stage) => {
                const info = getStageInfo(stage);
                const stageOrder = ['uploading', 'queued', 'loading', 'tts', 'extracting', 'detecting', 'cropping', 'stitching', 'complete'];
                const currentOrder = stageOrder.indexOf(processingState.stage);
                const thisOrder = stageOrder.indexOf(stage);
                const isActive = processingState.stage === stage;
                const isComplete = thisOrder < currentOrder;

                return (
                  <div
                    key={stage}
                    className={`text-center ${
                      isActive ? 'text-[var(--accent)]' : isComplete ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="text-xl mb-1">{info.icon}</div>
                    <div className="text-xs">{info.label}</div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Error message */}
        {processingState.stage === 'error' && processingState.error && (
          <div className="bg-[var(--error-soft)] text-[var(--error)] rounded-lg p-4">
            <p className="font-medium mb-1">Error Details:</p>
            <p className="text-sm">{processingState.error}</p>
          </div>
        )}

        {/* Server processing badge */}
        {processingState.stage !== 'error' && processingState.stage !== 'complete' && (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Powered by Vercel Fluid Compute</span>
          </div>
        )}
      </div>

      {/* Info card */}
      {processingState.stage !== 'error' && processingState.stage !== 'complete' && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-3">
          <h3 className="font-medium text-[var(--text-primary)]">Processing Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Segments</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.segments.length}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Voice</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.selectedVoice?.name}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Music</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.selectedMusic?.name || 'None'}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Job ID</p>
              <p className="font-medium text-[var(--text-primary)] font-mono text-xs">
                {serverProcessing.jobId ? serverProcessing.jobId.slice(0, 8) + '...' : 'Pending'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={isProcessing && processingState.stage !== 'error'}
        >
          Back to Upload
        </Button>

        {processingState.stage === 'error' && (
          <Button onClick={() => {
            setProcessingState({
              stage: 'uploading',
              currentSegment: 0,
              totalSegments: project.segments.length,
              progress: 0,
              message: 'Preparing to upload...',
            });
            processingRef.current = false;
            processVideo();
          }}>
            Retry Processing
          </Button>
        )}

        {processingState.stage === 'complete' && (
          <Button onClick={nextStep}>
            Preview Video
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
        )}
      </div>
    </div>
  );
}
