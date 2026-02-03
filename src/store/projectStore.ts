import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  ScriptSegment,
  Voice,
  MusicTrack,
  ProcessingProgress,
  WizardStep,
  CaptionStyle,
  SegmentCaptions,
} from '@/types';

// Server processing state
interface ServerProcessingState {
  jobId: string | null;
  videoUrl: string | null; // URL of uploaded video in Blob storage
  outputUrl: string | null; // URL of processed video in Blob storage
}

// Default caption style
const defaultCaptionStyle: CaptionStyle = {
  fontSize: 'medium',
  position: 'bottom',
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  highlightColor: '#FBBF24',
};

// Create empty project
const createEmptyProject = (): Project => ({
  id: uuidv4(),
  name: 'Untitled Short',
  createdAt: new Date(),
  videoFile: null,
  videoDuration: null,
  segments: [],
  selectedVoice: null,
  selectedMusic: null,
  musicVolume: 0.15,
  includeCaptions: true,
  captionStyle: defaultCaptionStyle,
  captions: [],
  outputVideo: null,
});

// Initial processing state
const initialProcessing: ProcessingProgress = {
  stage: 'idle',
  currentSegment: 0,
  totalSegments: 0,
  stageProgress: 0,
  message: '',
};

interface ProjectStore {
  // State
  currentStep: WizardStep;
  project: Project;
  processing: ProcessingProgress;
  serverProcessing: ServerProcessingState;
  isFFmpegLoaded: boolean;
  isPiperLoaded: boolean;
  isMediaPipeLoaded: boolean;

  // Navigation actions
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Project actions
  setVideoFile: (file: File, duration: number) => void;
  clearVideoFile: () => void;
  setProjectName: (name: string) => void;

  // Segment actions
  addSegment: (segment: Omit<ScriptSegment, 'id'>) => void;
  updateSegment: (id: string, updates: Partial<ScriptSegment>) => void;
  removeSegment: (id: string) => void;
  setSegments: (segments: ScriptSegment[]) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;

  // Voice and music actions
  setVoice: (voice: Voice | null) => void;
  setMusic: (track: MusicTrack | null) => void;
  setMusicVolume: (volume: number) => void;

  // Caption actions
  setIncludeCaptions: (include: boolean) => void;
  setCaptionStyle: (style: Partial<CaptionStyle>) => void;
  setCaptions: (captions: SegmentCaptions[]) => void;

  // Processing actions
  setProcessingProgress: (progress: Partial<ProcessingProgress>) => void;
  resetProcessing: () => void;

  // Server processing actions
  setJobId: (jobId: string | null) => void;
  setVideoUrl: (url: string | null) => void;
  setOutputUrl: (url: string | null) => void;

  // Output actions
  setOutputVideo: (video: Blob | null) => void;

  // Library loading state
  setFFmpegLoaded: (loaded: boolean) => void;
  setPiperLoaded: (loaded: boolean) => void;
  setMediaPipeLoaded: (loaded: boolean) => void;

  // Reset
  resetProject: () => void;
}

// Initial server processing state
const initialServerProcessing: ServerProcessingState = {
  jobId: null,
  videoUrl: null,
  outputUrl: null,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentStep: 'upload',
  project: createEmptyProject(),
  processing: initialProcessing,
  serverProcessing: initialServerProcessing,
  isFFmpegLoaded: false,
  isPiperLoaded: false,
  isMediaPipeLoaded: false,

  // Navigation actions
  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const steps: WizardStep[] = ['upload', 'process', 'preview'];
    const currentIndex = steps.indexOf(get().currentStep);
    if (currentIndex < steps.length - 1) {
      set({ currentStep: steps[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const steps: WizardStep[] = ['upload', 'process', 'preview'];
    const currentIndex = steps.indexOf(get().currentStep);
    if (currentIndex > 0) {
      set({ currentStep: steps[currentIndex - 1] });
    }
  },

  // Project actions
  setVideoFile: (file, duration) =>
    set((state) => ({
      project: {
        ...state.project,
        videoFile: file,
        videoDuration: duration,
      },
    })),

  clearVideoFile: () =>
    set((state) => ({
      project: {
        ...state.project,
        videoFile: null,
        videoDuration: null,
      },
    })),

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name },
    })),

  // Segment actions
  addSegment: (segment) =>
    set((state) => ({
      project: {
        ...state.project,
        segments: [...state.project.segments, { ...segment, id: uuidv4() }],
      },
    })),

  updateSegment: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        segments: state.project.segments.map((seg) =>
          seg.id === id ? { ...seg, ...updates } : seg
        ),
      },
    })),

  removeSegment: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        segments: state.project.segments.filter((seg) => seg.id !== id),
      },
    })),

  setSegments: (segments) =>
    set((state) => ({
      project: { ...state.project, segments },
    })),

  reorderSegments: (fromIndex, toIndex) =>
    set((state) => {
      const segments = [...state.project.segments];
      const [removed] = segments.splice(fromIndex, 1);
      segments.splice(toIndex, 0, removed);
      return { project: { ...state.project, segments } };
    }),

  // Voice and music actions
  setVoice: (voice) =>
    set((state) => ({
      project: { ...state.project, selectedVoice: voice },
    })),

  setMusic: (track) =>
    set((state) => ({
      project: { ...state.project, selectedMusic: track },
    })),

  setMusicVolume: (volume) =>
    set((state) => ({
      project: { ...state.project, musicVolume: Math.max(0, Math.min(1, volume)) },
    })),

  // Caption actions
  setIncludeCaptions: (include) =>
    set((state) => ({
      project: { ...state.project, includeCaptions: include },
    })),

  setCaptionStyle: (style) =>
    set((state) => ({
      project: {
        ...state.project,
        captionStyle: { ...state.project.captionStyle, ...style },
      },
    })),

  setCaptions: (captions) =>
    set((state) => ({
      project: { ...state.project, captions },
    })),

  // Processing actions
  setProcessingProgress: (progress) =>
    set((state) => ({
      processing: { ...state.processing, ...progress },
    })),

  resetProcessing: () => set({ processing: initialProcessing }),

  // Server processing actions
  setJobId: (jobId) =>
    set((state) => ({
      serverProcessing: { ...state.serverProcessing, jobId },
    })),

  setVideoUrl: (url) =>
    set((state) => ({
      serverProcessing: { ...state.serverProcessing, videoUrl: url },
    })),

  setOutputUrl: (url) =>
    set((state) => ({
      serverProcessing: { ...state.serverProcessing, outputUrl: url },
    })),

  // Output actions
  setOutputVideo: (video) =>
    set((state) => ({
      project: { ...state.project, outputVideo: video },
    })),

  // Library loading state
  setFFmpegLoaded: (loaded) => set({ isFFmpegLoaded: loaded }),
  setPiperLoaded: (loaded) => set({ isPiperLoaded: loaded }),
  setMediaPipeLoaded: (loaded) => set({ isMediaPipeLoaded: loaded }),

  // Reset
  resetProject: () =>
    set({
      currentStep: 'upload',
      project: createEmptyProject(),
      processing: initialProcessing,
      serverProcessing: initialServerProcessing,
    }),
}));
