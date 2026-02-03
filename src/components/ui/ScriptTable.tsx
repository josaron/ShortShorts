'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ScriptSegment } from '@/types';
import { Button } from './Button';
import { parseTimestamp, formatTimestamp } from '@/lib/utils/time';

interface ScriptTableProps {
  segments: ScriptSegment[];
  onSegmentsChange: (segments: ScriptSegment[]) => void;
  videoDuration?: number | null;
}

export function ScriptTable({
  segments,
  onSegmentsChange,
  videoDuration,
}: ScriptTableProps) {
  const [rawInput, setRawInput] = useState('');
  const [showImport, setShowImport] = useState(segments.length === 0);

  const handleAddSegment = useCallback(() => {
    const lastSegment = segments[segments.length - 1];
    const newOutputTime = lastSegment
      ? lastSegment.outputTime + (lastSegment.ttsDuration || 6)
      : 0;

    const newSegment: ScriptSegment = {
      id: uuidv4(),
      outputTime: newOutputTime,
      script: '',
      sourceTimestamp: 0,
      sourceDescription: '',
    };

    onSegmentsChange([...segments, newSegment]);
  }, [segments, onSegmentsChange]);

  const handleUpdateSegment = useCallback(
    (id: string, field: keyof ScriptSegment, value: string | number) => {
      onSegmentsChange(
        segments.map((seg) =>
          seg.id === id ? { ...seg, [field]: value } : seg
        )
      );
    },
    [segments, onSegmentsChange]
  );

  const handleRemoveSegment = useCallback(
    (id: string) => {
      onSegmentsChange(segments.filter((seg) => seg.id !== id));
    },
    [segments, onSegmentsChange]
  );

  const handleImportScript = useCallback(() => {
    // Parse the raw input - expected format:
    // Time | Script | [Timestamp] (Description)
    const lines = rawInput.trim().split('\n');
    const newSegments: ScriptSegment[] = [];

    // Skip header line if present
    const startIndex = lines[0]?.toLowerCase().includes('time') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try to parse the line
      // Format: "00:00 | Script text | [23:23] (Description)"
      // Or tab-separated
      const parts = line.includes('|')
        ? line.split('|').map((p) => p.trim())
        : line.split('\t').map((p) => p.trim());

      if (parts.length >= 2) {
        const outputTime = parseTimestamp(parts[0]) || 0;
        const script = parts[1] || '';
        
        // Parse source timestamp and description
        let sourceTimestamp = 0;
        let sourceDescription = '';
        
        if (parts[2]) {
          const sourceMatch = parts[2].match(/\[?([\d:]+)\]?\s*\(?([^)]*)\)?/);
          if (sourceMatch) {
            sourceTimestamp = parseTimestamp(sourceMatch[1]) || 0;
            sourceDescription = sourceMatch[2]?.trim() || '';
          }
        }

        newSegments.push({
          id: uuidv4(),
          outputTime,
          script,
          sourceTimestamp,
          sourceDescription,
        });
      }
    }

    if (newSegments.length > 0) {
      onSegmentsChange(newSegments);
      setShowImport(false);
      setRawInput('');
    }
  }, [rawInput, onSegmentsChange]);

  if (showImport && segments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Import Script
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImport(false)}
          >
            Add manually instead
          </Button>
        </div>

        <p className="text-sm text-[var(--text-secondary)]">
          Paste your script in the 3-column format: Time | Script | Source Timestamp
        </p>

        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={`00:00 | Did you know a 51-foot fire-breathing dragon... | [23:23] (Close up of Murphy)
00:06 | This is Murphy. He was the star... | [24:02] (Murphy emerging)
00:14 | Built by Disney veterans... | [23:37] (Mechanical skeleton)`}
          className="w-full h-48 p-4 rounded-lg border border-[var(--border)] bg-white
            text-[var(--text-primary)] text-sm font-mono
            placeholder:text-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
            resize-none"
        />

        <div className="flex gap-2">
          <Button onClick={handleImportScript} disabled={!rawInput.trim()}>
            Import Script
          </Button>
          <Button variant="secondary" onClick={() => setRawInput('')}>
            Clear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">
          Script Segments ({segments.length})
        </h3>
        <div className="flex gap-2">
          {segments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSegmentsChange([]);
                setShowImport(true);
              }}
            >
              Clear & Import
            </Button>
          )}
          <Button size="sm" onClick={handleAddSegment}>
            Add Segment
          </Button>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-8 bg-[var(--bg-secondary)] rounded-lg">
          <p className="text-[var(--text-muted)]">No segments added yet</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => setShowImport(true)}
          >
            Import from clipboard
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)] w-24">
                  Time
                </th>
                <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">
                  Script / Voiceover
                </th>
                <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)] w-40">
                  Source Timestamp
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment, index) => (
                <tr
                  key={segment.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                >
                  <td className="p-3">
                    <input
                      type="text"
                      value={formatTimestamp(segment.outputTime)}
                      onChange={(e) => {
                        const parsed = parseTimestamp(e.target.value);
                        if (parsed !== null) {
                          handleUpdateSegment(segment.id, 'outputTime', parsed);
                        }
                      }}
                      className="w-full px-2 py-1.5 rounded border border-[var(--border)]
                        text-sm font-mono bg-white
                        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    />
                  </td>
                  <td className="p-3">
                    <textarea
                      value={segment.script}
                      onChange={(e) =>
                        handleUpdateSegment(segment.id, 'script', e.target.value)
                      }
                      rows={2}
                      className="w-full px-2 py-1.5 rounded border border-[var(--border)]
                        text-sm bg-white resize-none
                        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder="Enter voiceover text..."
                    />
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formatTimestamp(segment.sourceTimestamp)}
                        onChange={(e) => {
                          const parsed = parseTimestamp(e.target.value);
                          if (parsed !== null) {
                            // Validate against video duration
                            if (!videoDuration || parsed <= videoDuration) {
                              handleUpdateSegment(
                                segment.id,
                                'sourceTimestamp',
                                parsed
                              );
                            }
                          }
                        }}
                        className="w-full px-2 py-1.5 rounded border border-[var(--border)]
                          text-sm font-mono bg-white
                          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder="MM:SS"
                      />
                      <input
                        type="text"
                        value={segment.sourceDescription || ''}
                        onChange={(e) =>
                          handleUpdateSegment(
                            segment.id,
                            'sourceDescription',
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 rounded border border-[var(--border)]
                          text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder="Description..."
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleRemoveSegment(segment.id)}
                      className="p-1.5 rounded hover:bg-[var(--error-soft)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                      title="Remove segment"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {segments.length > 0 && (
        <div className="text-sm text-[var(--text-muted)]">
          Total segments: {segments.length} | Estimated duration:{' '}
          {formatTimestamp(
            segments.reduce((acc, seg) => acc + (seg.ttsDuration || 6), 0)
          )}
        </div>
      )}
    </div>
  );
}
