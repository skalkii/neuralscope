'use client';

import { useCallback, useMemo, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { runWithFeed, type Prediction } from '@/lib/onnx/runHelpers';
import { PredictionList } from './PredictionList';

type Props = { dims: number[] };

export function TensorInput({ dims }: Props) {
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const sessionError = useScopeStore((s) => s.sessionError);
  const inputNames = useScopeStore((s) => s.inputNames);
  const isInferring = useScopeStore((s) => s.isInferring);
  const lastRunMs = useScopeStore((s) => s.lastRunMs);

  const resolvedDims = useMemo(() => dims.map((d) => (d > 0 ? d : 1)), [dims]);
  const expectedLength = useMemo(
    () => resolvedDims.reduce((a, b) => a * b, 1),
    [resolvedDims],
  );

  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);

  const fillRandom = useCallback(() => {
    const arr: number[] = new Array(expectedLength);
    for (let i = 0; i < expectedLength; i++) {
      arr[i] = +((Math.random() - 0.5) * 2).toFixed(4);
    }
    setRaw(JSON.stringify(arr));
  }, [expectedLength]);

  const fillZero = useCallback(() => {
    setRaw(JSON.stringify(new Array(expectedLength).fill(0)));
  }, [expectedLength]);

  const run = useCallback(async () => {
    setError(null);
    const inputName = inputNames[0];
    if (!inputName) {
      setError('No input tensor name from session');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setError(`JSON parse: ${(e as Error).message}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setError('Expected a JSON array of numbers');
      return;
    }
    const flat = (parsed as unknown[]).flat(Infinity) as unknown[];
    if (flat.length !== expectedLength) {
      setError(
        `Expected ${expectedLength} values for shape [${resolvedDims.join('×')}], got ${flat.length}`,
      );
      return;
    }
    const data = new Float32Array(expectedLength);
    for (let i = 0; i < expectedLength; i++) {
      const v = Number(flat[i]);
      if (!Number.isFinite(v)) {
        setError(`Non-numeric value at index ${i}`);
        return;
      }
      data[i] = v;
    }
    try {
      const outcome = await runWithFeed(inputName, data, resolvedDims);
      if (outcome) setPredictions(outcome.predictions);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [raw, inputNames, expectedLength, resolvedDims]);

  return (
    <section className="flex flex-col gap-2 rounded border border-zinc-800 p-3">
      <div className="text-[10px] tracking-wider text-zinc-500 uppercase">
        Input · raw tensor [{dims.join('×') || '?'}]
      </div>
      <div className="text-[10px] leading-relaxed text-zinc-500">
        Paste a JSON array of {expectedLength.toLocaleString()} numbers (it will
        reshape to the input dims in row-major order).
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={4}
        placeholder="[0.1, 0.2, …]"
        className="rounded border border-zinc-700 bg-zinc-900 p-1.5 font-mono text-[10px] text-zinc-200"
      />
      <div className="flex gap-1">
        <button
          onClick={fillRandom}
          className="flex-1 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-900"
        >
          random
        </button>
        <button
          onClick={fillZero}
          className="flex-1 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-900"
        >
          zeros
        </button>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={sessionStatus !== 'ready' || isInferring}
        className="min-h-[44px] rounded bg-cyan-500 px-3 py-2 text-xs font-semibold text-black hover:bg-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {isInferring
          ? 'Running…'
          : sessionStatus === 'initializing'
            ? 'Initializing…'
            : 'Run inference'}
      </button>

      {(error || (sessionStatus === 'error' && sessionError)) && (
        <div className="rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-200">
          {error || sessionError}
        </div>
      )}

      {predictions && (
        <PredictionList predictions={predictions} lastRunMs={lastRunMs} />
      )}
    </section>
  );
}
