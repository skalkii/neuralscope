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
  const graph = useScopeStore((s) => s.graph);
  const selectedLayerId = useScopeStore((s) => s.selectedLayerId);
  const selectedGroup = graph?.groups.find((g) => g.id === selectedLayerId);
  const lodByGroup = useScopeStore((s) => s.lodByGroup);
  const nearGroupId = useScopeStore((s) => s.nearGroupId);
  const selectedLod = selectedLayerId
    ? lodByGroup[selectedLayerId] ?? 'far'
    : nearGroupId
      ? 'near'
      : 'far';
  const selectedNeuronIndex = useScopeStore((s) => s.selectedNeuronIndex);
  const summariesByGroup = useScopeStore((s) => s.summariesByGroup);
  const selectedSummary = selectedLayerId
    ? summariesByGroup[selectedLayerId]
    : undefined;

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

        <div className="rounded border border-zinc-800 p-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
          <span>
            LOD: <span className="text-zinc-200">{selectedLod}</span>
          </span>
          {nearGroupId && (
            <span className="text-cyan-300">
              near: {nearGroupId.slice(0, 12)}
              {nearGroupId.length > 12 ? '…' : ''}
            </span>
          )}
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
            {selectedSummary && (
              <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-400 flex flex-col gap-0.5">
                <div>
                  activation kind:{' '}
                  <span className="text-zinc-200">{selectedSummary.kind}</span>
                </div>
                <div>
                  mean|x|:{' '}
                  <span className="text-zinc-200">
                    {selectedSummary.scalar.toFixed(4)}
                  </span>
                </div>
                <div>
                  max:{' '}
                  <span className="text-zinc-200">
                    {selectedSummary.max.toFixed(4)}
                  </span>{' '}
                  · sparsity{' '}
                  <span className="text-zinc-200">
                    {(selectedSummary.sparsity * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  neurons shown:{' '}
                  <span className="text-zinc-200">
                    {selectedSummary.values.length}
                  </span>
                </div>
                {selectedNeuronIndex != null &&
                  selectedNeuronIndex < selectedSummary.values.length && (
                    <div className="mt-1 rounded bg-zinc-900/60 p-1.5">
                      <div className="text-cyan-300">
                        neuron {selectedNeuronIndex}
                      </div>
                      <div>
                        value:{' '}
                        <span className="text-zinc-200">
                          {selectedSummary.values[
                            selectedNeuronIndex
                          ].toFixed(4)}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </section>
        )}

        <p className="mt-auto text-[10px] text-zinc-600">
          Phase 5 — LOD + per-neuron selection
        </p>
      </aside>

      <main className="relative flex-1">
        <Scene />
        <HeroOverlay />
      </main>
    </div>
  );
}
