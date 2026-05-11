'use client';

import { useEffect, useState } from 'react';
import {
  useScopeStore,
  type ExecutionProvider,
} from '@/lib/store/useScopeStore';

export function EngineToggle() {
  const executionProvider = useScopeStore((s) => s.executionProvider);
  const activeProvider = useScopeStore((s) => s.activeProvider);
  const setExecutionProvider = useScopeStore((s) => s.setExecutionProvider);
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setWebgpuSupported(
      typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined',
    );
  }, []);

  const choose = (provider: ExecutionProvider) => {
    if (provider === executionProvider) return;
    setExecutionProvider(provider);
  };

  return (
    <div className="rounded border border-zinc-800 p-2 flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Engine
      </div>
      <div className="flex gap-1" role="group" aria-label="Inference engine">
        <button
          type="button"
          onClick={() => choose('wasm')}
          aria-pressed={executionProvider === 'wasm'}
          className={`flex-1 rounded px-2 py-1 text-[10px] font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
            executionProvider === 'wasm'
              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
              : 'border-zinc-700 text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          WASM
        </button>
        <button
          type="button"
          onClick={() => choose('webgpu')}
          disabled={webgpuSupported === false}
          aria-pressed={executionProvider === 'webgpu'}
          title={
            webgpuSupported === false
              ? 'navigator.gpu is undefined in this browser'
              : 'WebGPU (falls back to WASM if init fails)'
          }
          className={`flex-1 rounded px-2 py-1 text-[10px] font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
            executionProvider === 'webgpu'
              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
              : 'border-zinc-700 text-zinc-400 hover:bg-zinc-900'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          WebGPU
        </button>
      </div>
      {sessionStatus === 'ready' && activeProvider && (
        <div className="text-[10px] text-zinc-500 font-mono">
          active: <span className="text-zinc-200">{activeProvider}</span>
          {activeProvider !== executionProvider && (
            <span className="text-amber-400"> (fallback)</span>
          )}
        </div>
      )}
    </div>
  );
}
