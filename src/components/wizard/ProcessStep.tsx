'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui';
import { formatDuration } from '@/lib/utils/time';

// Import processing libraries
import { getFFmpeg, extractClip, extractFrames, smartCrop, adjustDuration, getVideoDuration, getVideoDimensions, stitchSegments } from '@/lib/ffmpeg';
import { synthesizeText } from '@/lib/piper';
import { analyzeFramesForFaces, calculateOptimalCrop } from '@/lib/mediapipe';
import { generateCaptions } from '@/lib/utils/captions';

type ProcessingStage = 'loading' | 'tts' | 'extracting' | 'detecting' | 'cropping' | 'stitching' | 'complete' | 'error';

interface ProcessingState {
  stage: ProcessingStage;
  currentSegment: number;
  totalSegments: number;
  progress: number;
  message: string;
  error?: string;
}

export function ProcessStep() {
  const {
    project,
    setProcessingProgress,
    setOutputVideo,
    setCaptions,
    nextStep,
    prevStep,
  } = useProjectStore();

  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'loading',
    currentSegment: 0,
    totalSegments: project.segments.length,
    progress: 0,
    message: 'Initializing...',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

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
      // Stage 1: Load FFmpeg
      updateProgress({
        stage: 'loading',
        progress: 0,
        message: 'Loading FFmpeg...',
      });
      
      await getFFmpeg();
      
      updateProgress({
        stage: 'loading',
        progress: 100,
        message: 'FFmpeg loaded',
      });

      // Stage 2: Generate TTS for all segments
      updateProgress({
        stage: 'tts',
        progress: 0,
        message: 'Generating voiceover...',
      });

      interface TTSResult {
        audio: Blob;
        duration: number;
      }
      
      const ttsResults: TTSResult[] = [];

      for (let i = 0; i < project.segments.length; i++) {
        const segment = project.segments[i];
        
        updateProgress({
          stage: 'tts',
          currentSegment: i + 1,
          progress: ((i) / project.segments.length) * 100,
          message: `Synthesizing segment ${i + 1}/${project.segments.length}...`,
        });

        const result = await synthesizeText(segment.script, project.selectedVoice);
        ttsResults.push(result);
      }

      updateProgress({
        stage: 'tts',
        progress: 100,
        message: 'Voiceover complete',
      });

      // Generate captions
      if (project.includeCaptions) {
        const captionData = generateCaptions(
          project.segments,
          ttsResults.map((r) => r.duration)
        );
        setCaptions(captionData);
      }

      // Stage 3: Extract video clips
      updateProgress({
        stage: 'extracting',
        progress: 0,
        message: 'Extracting video clips...',
      });

      const extractedClips: Blob[] = [];

      for (let i = 0; i < project.segments.length; i++) {
        const segment = project.segments[i];
        
        updateProgress({
          stage: 'extracting',
          currentSegment: i + 1,
          progress: ((i) / project.segments.length) * 100,
          message: `Extracting clip ${i + 1}/${project.segments.length}...`,
        });

        // Extract 10 seconds starting from the source timestamp
        const clip = await extractClip(project.videoFile, segment.sourceTimestamp, 10);
        extractedClips.push(clip);
      }

      updateProgress({
        stage: 'extracting',
        progress: 100,
        message: 'Clips extracted',
      });

      // Stage 4: Face detection and cropping
      updateProgress({
        stage: 'detecting',
        progress: 0,
        message: 'Detecting faces and cropping...',
      });

      const processedClips: Blob[] = [];

      for (let i = 0; i < extractedClips.length; i++) {
        const clip = extractedClips[i];
        const audioDuration = ttsResults[i].duration;

        updateProgress({
          stage: 'detecting',
          currentSegment: i + 1,
          progress: ((i) / extractedClips.length) * 100,
          message: `Processing clip ${i + 1}/${extractedClips.length}...`,
        });

        // Get video dimensions
        const dimensions = await getVideoDimensions(clip);

        // Extract frames for face detection (every 0.5 seconds)
        const frames = await extractFrames(clip, 0.5);

        // Detect faces in frames
        const faceCenters = await analyzeFramesForFaces(frames);

        // Calculate optimal crop
        const cropRegion = calculateOptimalCrop(
          faceCenters,
          dimensions.width,
          dimensions.height
        );

        // Apply smart crop
        const croppedClip = await smartCrop(
          clip,
          faceCenters,
          dimensions.width,
          dimensions.height
        );

        // Adjust duration to match TTS audio
        const clipDuration = await getVideoDuration(croppedClip);
        const adjustedClip = await adjustDuration(croppedClip, audioDuration, clipDuration);

        processedClips.push(adjustedClip);
      }

      updateProgress({
        stage: 'detecting',
        progress: 100,
        message: 'Clips processed',
      });

      // Stage 5: Stitch everything together
      updateProgress({
        stage: 'stitching',
        progress: 0,
        message: 'Stitching final video...',
      });

      // Prepare segments for stitching
      const stitchSegmentData = processedClips.map((video, i) => ({
        video,
        audio: ttsResults[i].audio,
        duration: ttsResults[i].duration,
      }));

      // Fetch background music if selected
      let musicBlob: Blob | null = null;
      if (project.selectedMusic) {
        try {
          const response = await fetch(project.selectedMusic.filePath);
          if (response.ok) {
            musicBlob = await response.blob();
          }
        } catch (error) {
          console.warn('Failed to load background music:', error);
        }
      }

      // Stitch all segments
      const finalVideo = await stitchSegments(
        stitchSegmentData,
        musicBlob,
        project.musicVolume
      );

      // Save output
      setOutputVideo(finalVideo);

      updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Video processing complete!',
      });

    } catch (error) {
      console.error('Processing error:', error);
      updateProgress({
        stage: 'error',
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [project, updateProgress, setOutputVideo, setCaptions]);

  // Start processing automatically
  useEffect(() => {
    if (!isProcessing && processingState.stage === 'loading') {
      processVideo();
    }
  }, []);

  const getStageInfo = (stage: ProcessingStage) => {
    const stages: Record<ProcessingStage, { label: string; icon: string }> = {
      loading: { label: 'Loading Libraries', icon: '⏳' },
      tts: { label: 'Generating Voiceover', icon: '🎙️' },
      extracting: { label: 'Extracting Clips', icon: '🎬' },
      detecting: { label: 'Smart Cropping', icon: '🔍' },
      cropping: { label: 'Applying Crops', icon: '✂️' },
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
            : 'Please wait while we create your short video'}
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
          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-[var(--border)]">
            {(['tts', 'extracting', 'detecting', 'stitching', 'complete'] as ProcessingStage[]).map(
              (stage, index) => {
                const info = getStageInfo(stage);
                const stageOrder = ['loading', 'tts', 'extracting', 'detecting', 'cropping', 'stitching', 'complete'];
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
              <p className="text-[var(--text-muted)]">Captions</p>
              <p className="font-medium text-[var(--text-primary)]">
                {project.includeCaptions ? 'Enabled' : 'Disabled'}
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
          disabled={isProcessing}
        >
          Back to Upload
        </Button>

        {processingState.stage === 'error' && (
          <Button onClick={processVideo}>
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
