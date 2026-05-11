'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import {
  disposeInference,
  initInference,
  runInference,
} from '@/lib/onnx/inferenceClient';
import { summarizeRun } from '@/lib/onnx/summarize';

const CELL_PX = 10;
const GRID = 28;
const DISPLAY = CELL_PX * GRID;

function isMnistShape(shape: number[] | null | undefined): boolean {
  if (!shape || shape.length !== 4) return false;
  const [, c, h, w] = shape;
  return c === 1 && h === 28 && w === 28;
}

export function MnistInput() {
  const modelBytes = useScopeStore((s) => s.modelBytes);
  const modelName = useScopeStore((s) => s.modelName);
  const graph = useScopeStore((s) => s.graph);
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const sessionError = useScopeStore((s) => s.sessionError);
  const inputNames = useScopeStore((s) => s.inputNames);
  const lastRunMs = useScopeStore((s) => s.lastRunMs);
  const setSessionStatus = useScopeStore((s) => s.setSessionStatus);
  const setSummaries = useScopeStore((s) => s.setSummaries);
  const setInferring = useScopeStore((s) => s.setInferring);
  const isInferring = useScopeStore((s) => s.isInferring);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Float32Array>(new Float32Array(GRID * GRID));
  const drawingRef = useRef<boolean>(false);
  const [hasInk, setHasInk] = useState(false);
  const [predictions, setPredictions] = useState<
    { label: string; score: number }[] | null
  >(null);

  const primaryInput = graph?.inputs[0];
  const primaryShape = primaryInput
    ? graph?.inputShapes[primaryInput] ?? null
    : null;
  const supported = isMnistShape(primaryShape);

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
    if (!modelBytes) {
      disposeInference();
      setSessionStatus('idle');
      return;
    }
    let cancelled = false;
    disposeInference();
    setSessionStatus('initializing');
    initInference(modelBytes)
      .then((info) => {
        if (cancelled) return;
        setSessionStatus('ready', {
          inputNames: info.inputNames,
          outputNames: info.outputNames,
        });
        console.log(
          `[NeuralScope] session ready · inputs=${info.inputNames.join(',')} · added ${info.addedCount} intermediate outputs`,
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSessionStatus('error', {
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [modelBytes, setSessionStatus]);

  useEffect(() => {
    pixelsRef.current = new Float32Array(GRID * GRID);
    setHasInk(false);
    setPredictions(null);
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
      setHasInk(true);
      redraw();
    },
    [redraw],
  );

  const clear = useCallback(() => {
    pixelsRef.current = new Float32Array(GRID * GRID);
    setHasInk(false);
    setPredictions(null);
    redraw();
  }, [redraw]);

  const run = useCallback(async () => {
    if (!graph || !primaryInput || sessionStatus !== 'ready') return;
    setInferring(true);
    try {
      const inputName = inputNames[0] ?? primaryInput;
      const feed = new Float32Array(pixelsRef.current);
      const { outputs, elapsedMs } = await runInference({
        [inputName]: { data: feed, dims: [1, 1, GRID, GRID] },
      });
      const summaries = summarizeRun(graph, outputs);
      setSummaries(summaries, elapsedMs);
      console.groupCollapsed(
        `[NeuralScope] run ${elapsedMs.toFixed(1)}ms · ${summaries.length} layer summaries`,
      );
      for (const s of summaries) {
        console.log(
          `${s.groupLabel.padEnd(28)} dims=[${s.dims.join(',')}] kind=${s.kind} mean|x|=${s.scalar.toFixed(4)} max=${s.max.toFixed(4)} sparsity=${(s.sparsity * 100).toFixed(1)}%`,
        );
      }
      console.groupEnd();

      const finalName = graph.outputs[0];
      const final = finalName ? outputs[finalName] : undefined;
      if (final && final.data.length >= 2) {
        const logits = Array.from(final.data);
        const max = Math.max(...logits);
        let sum = 0;
        const exps = logits.map((v) => {
          const e = Math.exp(v - max);
          sum += e;
          return e;
        });
        const probs = exps.map((e) => e / sum);
        const top = probs
          .map((p, i) => ({ label: String(i), score: p }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setPredictions(top);
      } else {
        setPredictions(null);
      }
    } catch (e) {
      console.error('[NeuralScope] run failed:', e);
      setSessionStatus('error', {
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setInferring(false);
    }
  }, [
    graph,
    primaryInput,
    sessionStatus,
    inputNames,
    setInferring,
    setSummaries,
    setSessionStatus,
  ]);

  if (!modelBytes || !graph) return null;

  return (
    <section className="flex flex-col gap-2 rounded border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Input
      </div>

      {!supported ? (
        <div className="text-[11px] text-zinc-400 leading-relaxed">
          Input shape [{primaryShape?.join('×') ?? '?'}] not yet supported.
          Phase 3 ships MNIST (1×1×28×28). Image and tokenizer inputs land in
          Phase 6.
        </div>
      ) : (
        <>
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
                disabled={
                  sessionStatus !== 'ready' || isInferring || !hasInk
                }
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

          {sessionStatus === 'error' && sessionError && (
            <div className="rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-200">
              {sessionError}
            </div>
          )}

          {predictions && (
            <div className="flex flex-col gap-1 text-[11px] font-mono">
              <div className="text-zinc-500">top-3:</div>
              {predictions.map((p) => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className="text-zinc-200 w-4">{p.label}</span>
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
            </div>
          )}

          {lastRunMs != null && (
            <div className="text-[10px] text-zinc-500 font-mono">
              last run: {lastRunMs.toFixed(1)} ms
            </div>
          )}
        </>
      )}
    </section>
  );
}
