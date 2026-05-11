'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import {
  fileToImageBitmap,
  imageToNCHW,
  type ChannelLayout,
  type ImageNormalize,
} from '@/lib/onnx/imageToTensor';
import { runWithFeed, type Prediction } from '@/lib/onnx/runHelpers';
import { PredictionList } from './PredictionList';

type Props = { layout: ChannelLayout; width: number; height: number };

const NORMALIZE_OPTIONS: { value: ImageNormalize; label: string }[] = [
  { value: 'unit', label: '0..1' },
  { value: 'imagenet', label: 'imagenet' },
  { value: 'centered', label: '-1..1' },
  { value: 'caffe', label: 'caffe BGR' },
];

export function ImageInput({ layout, width, height }: Props) {
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const sessionError = useScopeStore((s) => s.sessionError);
  const inputNames = useScopeStore((s) => s.inputNames);
  const isInferring = useScopeStore((s) => s.isInferring);
  const lastRunMs = useScopeStore((s) => s.lastRunMs);
  const setLoadError = useScopeStore((s) => s.setLoadError);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resampledPreview, setResampledPreview] = useState<string | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [normalize, setNormalize] = useState<ImageNormalize>(
    layout === 'rgb' ? 'imagenet' : 'unit',
  );
  const [dragging, setDragging] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const accept = useCallback(
    async (file: File) => {
      setRunError(null);
      setLoadError(null);
      if (!file.type.startsWith('image/')) {
        setRunError(`Not an image file: ${file.name}`);
        return;
      }
      try {
        const bmp = await fileToImageBitmap(file);
        setBitmap(bmp);
        const url = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        // Paint a downscaled-to-target preview so the user sees the
        // pixel grid the model actually receives (after resize, before
        // normalize).
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(bmp, 0, 0, width, height);
          setResampledPreview(canvas.toDataURL());
        } else {
          setResampledPreview(null);
        }
        setPredictions(null);
      } catch (e) {
        setRunError((e as Error).message);
      }
    },
    [setLoadError, width, height],
  );

  const run = useCallback(async () => {
    setRunError(null);
    if (!bitmap) return;
    const inputName = inputNames[0];
    if (!inputName) return;
    try {
      const { data, dims } = imageToNCHW(bitmap, {
        width,
        height,
        layout,
        normalize,
      });
      const outcome = await runWithFeed(inputName, data, dims);
      if (outcome) setPredictions(outcome.predictions);
    } catch (e) {
      setRunError((e as Error).message);
      console.error('[NeuralScope] image run failed:', e);
    }
  }, [bitmap, inputNames, width, height, layout, normalize]);

  return (
    <section className="flex flex-col gap-2 rounded border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Input · {layout} {width}×{height}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) void accept(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded border border-dashed p-2 text-center text-[11px] transition-colors ${
          dragging
            ? 'border-cyan-400 bg-cyan-950/30 text-cyan-200'
            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
        }`}
      >
        {previewUrl ? (
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resampledPreview ?? previewUrl}
              alt={`input preview at ${width}×${height}`}
              style={{ imageRendering: 'pixelated' }}
              className="max-h-32 mx-auto rounded border border-zinc-800"
            />
            <span className="text-[10px] text-zinc-500">
              model sees {width}×{height} {layout}
            </span>
          </div>
        ) : (
          <>
            <div>Drop an image · or click</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              resized to {width}×{height}, {layout}
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void accept(f);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </div>

      <label className="flex items-center justify-between text-[10px] text-zinc-500">
        normalize
        <select
          value={normalize}
          onChange={(e) => setNormalize(e.target.value as ImageNormalize)}
          className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[10px]"
        >
          {NORMALIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={() => void run()}
        disabled={!bitmap || sessionStatus !== 'ready' || isInferring}
        className="rounded bg-cyan-500 px-2 py-1.5 text-[11px] font-semibold text-black hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
      >
        {isInferring
          ? 'Running…'
          : sessionStatus === 'initializing'
            ? 'Initializing…'
            : 'Run inference'}
      </button>

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
