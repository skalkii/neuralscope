'use client';

import dynamic from 'next/dynamic';
import { useScopeStore } from '@/lib/store/useScopeStore';

const Scene = dynamic(
  () => import('@/components/scene/Scene').then((m) => m.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 grid place-items-center text-zinc-500">
        Loading 3D scene…
      </div>
    ),
  },
);

export default function Home() {
  const modelName = useScopeStore((s) => s.modelName);
  const globalLod = useScopeStore((s) => s.globalLod);

  return (
    <div className="flex flex-1 h-screen w-screen bg-black text-zinc-100">
      <aside className="w-72 border-r border-zinc-800 p-4 flex flex-col gap-3">
        <h1 className="text-lg font-semibold tracking-tight">NeuralScope</h1>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Local 3D inspector for ONNX models. Drop a model to begin.
        </p>
        <div className="mt-2 rounded border border-dashed border-zinc-700 p-3 text-xs text-zinc-400">
          <div>
            Model: <span className="text-zinc-200">{modelName ?? 'none'}</span>
          </div>
          <div>
            LOD: <span className="text-zinc-200">{globalLod}</span>
          </div>
        </div>
        <p className="mt-auto text-[10px] text-zinc-600">
          Phase 1 — placeholder scene
        </p>
      </aside>

      <main className="relative flex-1">
        <Scene />
      </main>
    </div>
  );
}
