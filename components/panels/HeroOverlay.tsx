'use client';

import { useScopeStore } from '@/lib/store/useScopeStore';

export function HeroOverlay() {
  const graph = useScopeStore((s) => s.graph);
  if (graph) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-10 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(34,211,238,0.35)]">
          NeuralScope
        </h2>
        <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
          A 3D inspector for small ONNX neural networks. Drop a model in the
          sidebar — or pick an example — to step inside it.
        </p>
      </div>
      <div className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        <span>↑ pick an example</span>
        <span className="text-zinc-700">·</span>
        <span>drag to orbit · scroll to zoom</span>
      </div>
    </div>
  );
}
