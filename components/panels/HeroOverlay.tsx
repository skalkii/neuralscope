'use client';

import { useScopeStore } from '@/lib/store/useScopeStore';

export function HeroOverlay() {
  const graph = useScopeStore((s) => s.graph);
  if (graph) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <h2 className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent drop-shadow-[0_0_28px_rgba(34,211,238,0.35)] md:text-6xl">
          NeuralScope
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          A 3D inspector for small ONNX neural networks. Drop a model in the
          sidebar — or pick an example — to step inside it.
        </p>
      </div>
      <div className="flex flex-col items-center gap-1 text-[10px] tracking-[0.25em] text-zinc-500 uppercase">
        <span>↑ pick an example</span>
        <span className="text-zinc-700">·</span>
        <span>drag to orbit · scroll to zoom</span>
      </div>
    </div>
  );
}
