'use client';

import { useState } from 'react';
import type { Prediction } from '@/lib/onnx/runHelpers';

type Props = { predictions: Prediction[]; lastRunMs?: number | null };

export function PredictionList({ predictions, lastRunMs }: Props) {
  const [copied, setCopied] = useState(false);

  if (predictions.length === 0) return null;

  const copy = async () => {
    const text = predictions
      .map((p) => `${p.label}\t${(p.score * 100).toFixed(2)}%`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="flex flex-col gap-1 text-[11px] font-mono">
      <div className="flex items-center justify-between text-zinc-500">
        <span>top-{predictions.length}:</span>
        <button
          onClick={copy}
          className="rounded border border-zinc-800 px-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          aria-label="Copy predictions to clipboard"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      {predictions.map((p) => (
        <div key={p.label} className="flex items-center gap-2">
          <span className="text-zinc-200 w-16 truncate" title={p.label}>
            {p.label}
          </span>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${(p.score * 100).toFixed(0)}%` }}
            />
          </div>
          <span className="text-zinc-400 w-12 text-right">
            {(p.score * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      {lastRunMs != null && (
        <div className="text-[10px] text-zinc-500 font-mono">
          last run: {lastRunMs.toFixed(1)} ms
        </div>
      )}
    </div>
  );
}
