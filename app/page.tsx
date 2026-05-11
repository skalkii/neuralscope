'use client';

import dynamic from 'next/dynamic';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { ModelLoader } from '@/components/panels/ModelLoader';
import { ExampleModels } from '@/components/panels/ExampleModels';
import { MnistInput } from '@/components/panels/MnistInput';
import { HeroOverlay } from '@/components/panels/HeroOverlay';

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
  const globalLod = useScopeStore((s) => s.globalLod);
  const graph = useScopeStore((s) => s.graph);
  const selectedLayerId = useScopeStore((s) => s.selectedLayerId);
  const selectedGroup = graph?.groups.find((g) => g.id === selectedLayerId);

  return (
    <div className="flex flex-1 h-screen w-screen bg-black text-zinc-100">
      <aside className="w-80 border-r border-zinc-800 p-4 flex flex-col gap-4 overflow-y-auto">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">NeuralScope</h1>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
            Local 3D inspector for ONNX models.
          </p>
        </header>

        <ModelLoader />

        <ExampleModels />

        <MnistInput />

        <div className="rounded border border-zinc-800 p-2 text-[10px] font-mono text-zinc-400">
          LOD: <span className="text-zinc-200">{globalLod}</span>
        </div>

        {selectedGroup && (
          <section className="rounded border border-cyan-900 bg-cyan-950/20 p-3 text-[11px] flex flex-col gap-1">
            <div className="font-mono text-cyan-300 break-all">
              {selectedGroup.label}
            </div>
            <div className="text-zinc-400 break-all">
              id: <span className="text-zinc-200">{selectedGroup.id}</span>
            </div>
            <div className="text-zinc-400">
              params:{' '}
              <span className="text-zinc-200">
                {selectedGroup.paramCount.toLocaleString()}
              </span>
            </div>
            {selectedGroup.primary.inputShape && (
              <div className="text-zinc-400">
                in: [
                <span className="text-zinc-200">
                  {selectedGroup.primary.inputShape.join('×')}
                </span>
                ]
              </div>
            )}
            {selectedGroup.outputShape && (
              <div className="text-zinc-400">
                out: [
                <span className="text-zinc-200">
                  {selectedGroup.outputShape.join('×')}
                </span>
                ]
              </div>
            )}
            {selectedGroup.layers.length > 1 && (
              <div className="text-zinc-500 mt-1">
                fused: {selectedGroup.layers.map((l) => l.op).join(' → ')}
              </div>
            )}
          </section>
        )}

        <p className="mt-auto text-[10px] text-zinc-600">
          Phase 4 + beauty pass · idle hero & bloom
        </p>
      </aside>

      <main className="relative flex-1">
        <Scene />
        <HeroOverlay />
      </main>
    </div>
  );
}
