'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { ModelLoader } from '@/components/panels/ModelLoader';
import { ExampleModels } from '@/components/panels/ExampleModels';
import { InputPanel } from '@/components/panels/InputPanel';
import { HeroOverlay } from '@/components/panels/HeroOverlay';
import { SessionManager } from '@/components/panels/SessionManager';
import { EngineToggle } from '@/components/panels/EngineToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const requestCameraFit = useScopeStore((s) => s.requestCameraFit);
  const selectedSummary = selectedLayerId
    ? summariesByGroup[selectedLayerId]
    : undefined;
  const weightsByGroup = useScopeStore((s) => s.weightsByGroup);
  const selectedWeights = selectedLayerId
    ? weightsByGroup[selectedLayerId]
    : undefined;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-1 flex-col md:flex-row h-screen w-screen bg-black text-zinc-100">
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-expanded={sidebarOpen}
        className="md:hidden flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-300"
      >
        <span className="font-semibold">NeuralScope</span>
        <span className="font-mono text-zinc-500">
          {sidebarOpen ? 'hide ▴' : 'show ▾'}
        </span>
      </button>
      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 max-h-[60vh] md:max-h-none border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex-col gap-4 overflow-y-auto`}
      >
        <header>
          <h1 className="text-lg font-semibold tracking-tight">NeuralScope</h1>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
            Local 3D inspector for ONNX models.
          </p>
        </header>

        <ModelLoader />

        <ExampleModels />

        <InputPanel />

        <EngineToggle />

        <div className="rounded border border-zinc-800 p-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between gap-2">
          <span>
            LOD: <span className="text-zinc-200">{selectedLod}</span>
          </span>
          {nearGroupId && (
            <span className="text-cyan-300 truncate" title={nearGroupId}>
              near: {nearGroupId.slice(0, 12)}
              {nearGroupId.length > 12 ? '…' : ''}
            </span>
          )}
          {graph && (
            <button
              type="button"
              onClick={requestCameraFit}
              className="ml-auto rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label="Reframe camera to fit the whole network"
            >
              reframe
            </button>
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
            {selectedLod === 'near' && selectedWeights !== undefined && (
              <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-400 flex flex-col gap-0.5">
                {selectedWeights === 'missing' ? (
                  <div className="text-zinc-500">
                    no float-32 weight initializer found
                  </div>
                ) : (
                  <>
                    <div className="text-purple-300">weights:</div>
                    <div className="break-all">
                      <span className="text-zinc-200">
                        {selectedWeights.name}
                      </span>
                    </div>
                    <div>
                      shape:{' '}
                      <span className="text-zinc-200">
                        [{selectedWeights.dims.join('×')}]
                      </span>{' '}
                      ·{' '}
                      <span className="text-zinc-200">
                        {selectedWeights.data.length.toLocaleString()}
                      </span>{' '}
                      values
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <p className="mt-auto text-[10px] text-zinc-600">
          Phase 7 + weight heatmap on near-LOD layer
        </p>
      </aside>

      <main className="relative flex-1">
        <ErrorBoundary>
          <Scene />
        </ErrorBoundary>
        <HeroOverlay />
        <SessionManager />
      </main>
    </div>
  );
}
