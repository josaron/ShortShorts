'use client';

import { useCallback, useState, DragEvent, ChangeEvent } from 'react';

interface FileDropzoneProps {
  accept: string;
  onFileSelect: (file: File) => void;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  accept,
  onFileSelect,
  maxSize = 500 * 1024 * 1024, // 500MB default
  disabled = false,
  className = '',
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      // Check file type
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      const isValidType = acceptedTypes.some(
        (type) =>
          type === fileType ||
          type === fileExtension ||
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
      );

      if (!isValidType) {
        setError(`Invalid file type. Accepted: ${accept}`);
        return false;
      }

      // Check file size
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        setError(`File too large. Maximum size: ${maxSizeMB}MB`);
        return false;
      }

      return true;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200 cursor-pointer
          ${
            isDragOver
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]/10'
              : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 mb-4 rounded-full bg-[var(--accent-soft)]/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p className="text-[var(--text-primary)] font-medium mb-1">
            {isDragOver ? 'Drop file here' : 'Drag and drop or click to upload'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {accept.replace(/\./g, '').toUpperCase()} files up to{' '}
            {Math.round(maxSize / (1024 * 1024))}MB
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-[var(--error)] flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
