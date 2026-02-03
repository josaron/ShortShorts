'use client';

import { useProjectStore } from '@/store/projectStore';
import { StepIndicator } from './StepIndicator';
import { UploadStep } from './UploadStep';
import { ProcessStep } from './ProcessStep';
import { PreviewStep } from './PreviewStep';

export function Wizard() {
  const { currentStep, setStep, project, processing } = useProjectStore();

  // Determine if navigation is allowed
  const canNavigate = processing.stage === 'idle' || processing.stage === 'complete';

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return <UploadStep />;
      case 'process':
        return <ProcessStep />;
      case 'preview':
        return <PreviewStep />;
      default:
        return <UploadStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  ShortShorts
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  Create engaging shorts from long videos
                </p>
              </div>
            </div>

            {project.videoFile && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                  {project.videoFile.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {project.segments.length} segments
                </p>
              </div>
            )}
          </div>

          <StepIndicator
            currentStep={currentStep}
            onStepClick={setStep}
            allowNavigation={canNavigate}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-[var(--text-muted)]">
            All processing happens in your browser. Your video never leaves your device.
          </p>
        </div>
      </footer>
    </div>
  );
}
