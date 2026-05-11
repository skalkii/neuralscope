'use client';

import { useEffect, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import {
  fetchExampleManifest,
  loadOnnxFromUrl,
  LoadError,
  type ExampleModelManifest,
} from '@/lib/onnx/loadModel';

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExampleModels() {
  const setLoadError = useScopeStore((s) => s.setLoadError);
  const currentName = useScopeStore((s) => s.modelName);

  const [manifest, setManifest] = useState<ExampleModelManifest[] | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [busyFile, setBusyFile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExampleManifest()
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setManifestError(
            e instanceof Error ? e.message : 'manifest load failed',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = async (m: ExampleModelManifest) => {
    setLoadError(null);
    setBusyFile(m.file);
    try {
      await loadOnnxFromUrl(`/examples/${m.file}`, m.file);
    } catch (e) {
      const msg = e instanceof LoadError ? e.message : (e as Error).message;
      setLoadError({ message: msg });
    } finally {
      setBusyFile(null);
    }
  };

  if (manifestError) {
    return (
      <div className="text-[10px] text-red-300">
        examples unavailable: {manifestError}
      </div>
    );
  }

  if (!manifest) {
    return <div className="text-[10px] text-zinc-500">loading examples…</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Example models
      </div>
      <ul className="flex flex-col gap-1.5">
        {manifest.map((m) => {
          const active = currentName === m.file;
          const busy = busyFile === m.file;
          return (
            <li key={m.file}>
              <button
                disabled={busy}
                onClick={() => void load(m)}
                className={`w-full text-left rounded border p-2 text-[11px] transition-colors ${
                  active
                    ? 'border-cyan-600 bg-cyan-950/30'
                    : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
                } disabled:opacity-60 disabled:cursor-wait`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">{m.title}</span>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {busy ? '…' : fmtSize(m.sizeBytes)}
                  </span>
                </div>
                <div className="text-zinc-400 mt-0.5 leading-snug">
                  {m.description}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  {m.input}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
