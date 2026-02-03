'use client';

import type { WizardStep } from '@/types';

interface Step {
  id: WizardStep;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'upload', label: 'Upload', description: 'Video & script' },
  { id: 'process', label: 'Process', description: 'Generate short' },
  { id: 'preview', label: 'Preview', description: 'Review & export' },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  allowNavigation?: boolean;
}

export function StepIndicator({
  currentStep,
  onStepClick,
  allowNavigation = false,
}: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = allowNavigation && (isCompleted || isCurrent);

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step circle and content */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-3 group
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {/* Circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-medium text-sm transition-all duration-200
                    ${
                      isCompleted
                        ? 'bg-[var(--success)] text-white'
                        : isCurrent
                        ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent-soft)]/30'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-2 border-[var(--border)]'
                    }
                    ${isClickable ? 'group-hover:ring-2 group-hover:ring-[var(--accent-soft)]' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label and description */}
                <div className="hidden sm:block text-left">
                  <p
                    className={`
                      font-medium text-sm
                      ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                    `}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {step.description}
                  </p>
                </div>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={`
                      h-0.5 transition-colors duration-200
                      ${isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
