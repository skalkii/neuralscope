'use client';

import { useCallback, useRef, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { loadOnnxFromBytes, LoadError } from '@/lib/onnx/loadModel';
import { MODEL } from '@/lib/config';

const MAX_MODEL_BYTES = MODEL.MAX_BYTES;

export function ModelLoader() {
  const setLoadError = useScopeStore((s) => s.setLoadError);
  const clearModel = useScopeStore((s) => s.clearModel);
  const modelName = useScopeStore((s) => s.modelName);
  const loadError = useScopeStore((s) => s.loadError);
  const graph = useScopeStore((s) => s.graph);

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    async (file: File) => {
      setLoadError(null);
      if (!file.name.toLowerCase().endsWith('.onnx')) {
        setLoadError({ message: `Not an .onnx file: ${file.name}` });
        return;
      }
      if (file.size > MAX_MODEL_BYTES) {
        setLoadError({
          message: `File too large: ${(file.size / 1e6).toFixed(1)} MB > 50 MB limit`,
        });
        return;
      }
      setBusy(true);
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        loadOnnxFromBytes(buf, file.name);
      } catch (e) {
        const msg = e instanceof LoadError ? e.message : (e as Error).message;
        setLoadError({ message: msg });
      } finally {
        setBusy(false);
      }
    },
    [setLoadError],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void accept(file);
    },
    [accept],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void accept(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [accept],
  );

  const firstInput = graph?.inputs[0];
  const firstInputShape = firstInput ? graph?.inputShapes[firstInput] : null;

  const openPicker = () => inputRef.current?.click();
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={
          modelName
            ? `Loaded model ${modelName}. Click or press Enter to load another.`
            : 'Drop an ONNX model file here, or press Enter to pick one.'
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        className={`min-h-[44px] cursor-pointer rounded border-2 border-dashed p-3 text-center text-xs transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none ${
          dragging
            ? 'border-cyan-400 bg-cyan-950/30 text-cyan-200'
            : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
        }`}
      >
        {busy ? (
          'Parsing…'
        ) : modelName ? (
          <span>
            <span className="block break-all text-zinc-200">{modelName}</span>
            <span className="mt-1 block text-[10px] text-zinc-500">
              click or drop another
            </span>
          </span>
        ) : (
          <>
            <div>Drop .onnx here</div>
            <div className="mt-1 text-[10px] text-zinc-500">
              or click · max 50 MB
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".onnx"
          hidden
          onChange={onFile}
        />
      </div>

      {loadError && (
        <div className="rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-200">
          {loadError.message}
        </div>
      )}

      {graph && (
        <div className="font-mono text-[10px] leading-relaxed text-zinc-500">
          <div>
            {graph.groups.length} layers · {graph.layers.length} nodes
          </div>
          <div>{(graph.paramCount / 1e6).toFixed(2)} M params</div>
          {graph.truncated && (
            <div className="mt-1 text-amber-400">
              {'>'} 500 layers; middle collapsed
            </div>
          )}
          {firstInput && (
            <div className="mt-1 break-all">
              in: {firstInput} [{firstInputShape?.join('×') ?? '?'}]
            </div>
          )}
        </div>
      )}

      {modelName && (
        <button
          onClick={clearModel}
          className="self-start text-[10px] text-zinc-500 underline hover:text-zinc-300"
        >
          clear model
        </button>
      )}
    </div>
  );
}
