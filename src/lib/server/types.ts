/**
 * Server-side types for Vercel Fluid Compute processing
 */

export type JobStatus = 'pending' | 'processing' | 'complete' | 'error';

export type ProcessingStage = 
  | 'queued'
  | 'loading'
  | 'tts'
  | 'extracting'
  | 'detecting'
  | 'cropping'
  | 'stitching'
  | 'complete'
  | 'error';

export interface ProcessingJob {
  id: string;
  status: JobStatus;
  stage: ProcessingStage;
  progress: number; // 0-100
  currentSegment: number;
  totalSegments: number;
  message: string;
  error?: string;
  
  // Input data
  videoUrl: string;
  segments: ProcessingSegment[];
  voiceId: string;
  musicUrl?: string;
  musicVolume: number;
  includeCaptions: boolean;
  
  // Output data
  outputUrl?: string;
  captions?: SegmentCaptionData[];
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ProcessingSegment {
  id: string;
  script: string;
  sourceTimestamp: number;
  outputTime: number;
}

export interface SegmentCaptionData {
  segmentId: string;
  words: {
    text: string;
    startTime: number;
    endTime: number;
  }[];
}

export interface CreateJobRequest {
  videoUrl: string;
  segments: ProcessingSegment[];
  voiceId: string;
  musicUrl?: string;
  musicVolume: number;
  includeCaptions: boolean;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  stage: ProcessingStage;
  progress: number;
  currentSegment: number;
  totalSegments: number;
  message: string;
  error?: string;
  outputUrl?: string;
  captions?: SegmentCaptionData[];
}
