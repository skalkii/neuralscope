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
        const msg =
          e instanceof LoadError ? e.message : (e as Error).message;
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

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded border-2 border-dashed p-3 text-center text-xs transition-colors ${
          dragging
            ? 'border-cyan-400 bg-cyan-950/30 text-cyan-200'
            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
        }`}
      >
        {busy ? (
          'Parsing…'
        ) : modelName ? (
          <span>
            <span className="block text-zinc-200 break-all">{modelName}</span>
            <span className="block text-[10px] text-zinc-500 mt-1">
              click or drop another
            </span>
          </span>
        ) : (
          <>
            <div>Drop .onnx here</div>
            <div className="text-[10px] text-zinc-500 mt-1">
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
        <div className="text-[10px] text-zinc-500 leading-relaxed font-mono">
          <div>
            {graph.groups.length} layers · {graph.layers.length} nodes
          </div>
          <div>{(graph.paramCount / 1e6).toFixed(2)} M params</div>
          {graph.truncated && (
            <div className="text-amber-400 mt-1">
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
          className="self-start text-[10px] text-zinc-500 hover:text-zinc-300 underline"
        >
          clear model
        </button>
      )}
    </div>
  );
}
