// Script segment representing one section of the short
export interface ScriptSegment {
  id: string;
  outputTime: number; // When in the short this segment starts (seconds)
  script: string; // Voiceover text
  sourceTimestamp: number; // Timestamp in original video to extract from (seconds)
  sourceDescription?: string; // Optional description of the footage
  // Generated during processing
  ttsAudio?: ArrayBuffer;
  ttsDuration?: number;
  processedClip?: Blob;
}

// Available TTS voices
export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
  modelPath: string;
  configPath: string;
}

// Background music track
export interface MusicTrack {
  id: string;
  name: string;
  category: 'upbeat' | 'calm' | 'dramatic' | 'mystery';
  duration: number; // seconds
  filePath: string;
}

// Word timing for captions
export interface CaptionWord {
  text: string;
  startTime: number;
  endTime: number;
}

// Caption data for a segment
export interface SegmentCaptions {
  segmentId: string;
  words: CaptionWord[];
}

// Crop region for smart cropping
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Face detection result
export interface FaceDetection {
  timestamp: number;
  boundingBox: CropRegion;
  confidence: number;
}

// Processing progress
export interface ProcessingProgress {
  stage: 'idle' | 'loading' | 'tts' | 'extracting' | 'detecting' | 'cropping' | 'stitching' | 'mixing' | 'complete' | 'error';
  currentSegment: number;
  totalSegments: number;
  stageProgress: number; // 0-100
  message: string;
}

// Project state
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  videoFile: File | null;
  videoDuration: number | null;
  segments: ScriptSegment[];
  selectedVoice: Voice | null;
  selectedMusic: MusicTrack | null;
  musicVolume: number; // 0-1
  includeCaptions: boolean;
  captionStyle: CaptionStyle;
  captions: SegmentCaptions[];
  outputVideo: Blob | null;
}

// Caption styling options
export interface CaptionStyle {
  fontSize: 'small' | 'medium' | 'large';
  position: 'top' | 'center' | 'bottom';
  color: string;
  backgroundColor: string;
  highlightColor: string;
}

// Wizard step
export type WizardStep = 'upload' | 'process' | 'preview';

// App state
export interface AppState {
  currentStep: WizardStep;
  project: Project;
  processing: ProcessingProgress;
  isFFmpegLoaded: boolean;
  isPiperLoaded: boolean;
  isMediaPipeLoaded: boolean;
}
