'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { runWithFeed, type Prediction } from '@/lib/onnx/runHelpers';
import { PredictionList } from './PredictionList';

const CELL_PX = 10;
const GRID = 28;
const DISPLAY = CELL_PX * GRID;

export function MnistInput() {
  const modelName = useScopeStore((s) => s.modelName);
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const sessionError = useScopeStore((s) => s.sessionError);
  const inputNames = useScopeStore((s) => s.inputNames);
  const lastRunMs = useScopeStore((s) => s.lastRunMs);
  const isInferring = useScopeStore((s) => s.isInferring);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Float32Array>(new Float32Array(GRID * GRID));
  const drawingRef = useRef<boolean>(false);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, DISPLAY, DISPLAY);
    const px = pixelsRef.current;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = px[y * GRID + x];
        if (v <= 0) continue;
        const g = Math.round(255 * Math.min(1, v));
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
      }
    }
  }, []);

  useEffect(() => {
    pixelsRef.current = new Float32Array(GRID * GRID);
    setPredictions(null);
    setRunError(null);
    redraw();
  }, [modelName, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const c = canvasRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const x = Math.floor(((clientX - rect.left) / rect.width) * GRID);
      const y = Math.floor(((clientY - rect.top) / rect.height) * GRID);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      const px = pixelsRef.current;
      const stamp = (dx: number, dy: number, v: number) => {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) return;
        const idx = yy * GRID + xx;
        if (px[idx] < v) px[idx] = v;
      };
      stamp(0, 0, 1.0);
      stamp(1, 0, 0.7);
      stamp(-1, 0, 0.7);
      stamp(0, 1, 0.7);
      stamp(0, -1, 0.7);
      stamp(1, 1, 0.3);
      stamp(-1, -1, 0.3);
      stamp(1, -1, 0.3);
      stamp(-1, 1, 0.3);
      redraw();
    },
    [redraw],
  );

  const clear = useCallback(() => {
    pixelsRef.current = new Float32Array(GRID * GRID);
    setPredictions(null);
    redraw();
  }, [redraw]);

  const run = useCallback(async () => {
    setRunError(null);
    if (sessionStatus !== 'ready') return;
    const inputName = inputNames[0];
    if (!inputName) return;
    try {
      const feed = new Float32Array(pixelsRef.current);
      const outcome = await runWithFeed(inputName, feed, [1, 1, GRID, GRID]);
      if (outcome) setPredictions(outcome.predictions);
    } catch (e) {
      setRunError((e as Error).message);
      console.error('[NeuralScope] mnist run failed:', e);
    }
  }, [sessionStatus, inputNames]);

  return (
    <section className="flex flex-col gap-2 rounded border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Input · MNIST 28×28
      </div>

      <div className="flex flex-col gap-2 items-center">
        <canvas
          ref={canvasRef}
          width={DISPLAY}
          height={DISPLAY}
          className="rounded border border-zinc-700 cursor-crosshair touch-none"
          onPointerDown={(e) => {
            drawingRef.current = true;
            (e.target as Element).setPointerCapture(e.pointerId);
            paint(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (drawingRef.current) paint(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            drawingRef.current = false;
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
          }}
        />
        <div className="flex gap-2 self-stretch">
          <button
            onClick={() => void run()}
            disabled={sessionStatus !== 'ready' || isInferring}
            className="flex-1 rounded bg-cyan-500 px-2 py-1.5 text-[11px] font-semibold text-black hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isInferring
              ? 'Running…'
              : sessionStatus === 'initializing'
                ? 'Initializing…'
                : 'Run inference'}
          </button>
          <button
            onClick={clear}
            className="rounded border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-900"
          >
            clear
          </button>
        </div>
      </div>

      {(runError || (sessionStatus === 'error' && sessionError)) && (
        <div className="rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-200">
          {runError || sessionError}
        </div>
      )}

      {predictions && (
        <PredictionList predictions={predictions} lastRunMs={lastRunMs} />
      )}
    </section>
  );
}
