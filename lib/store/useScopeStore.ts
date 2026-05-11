import { create } from 'zustand';
import type { Graph, LayerLayout } from '@/lib/onnx/types';
import type { LayoutBounds } from '@/lib/layout/topologicalLayout';
import type { GroupSummary } from '@/lib/onnx/summarize';

export type LodLevel = 'far' | 'mid' | 'near';

export type LoadError = { message: string } | null;

export type SessionStatus = 'idle' | 'initializing' | 'ready' | 'error';

export type ScopeState = {
  modelBytes: Uint8Array | null;
  modelName: string | null;
  graph: Graph | null;
  layout: LayerLayout | null;
  bounds: LayoutBounds | null;
  loadError: LoadError;
  sessionStatus: SessionStatus;
  sessionError: string | null;
  inputNames: string[];
  outputNames: string[];
  summaries: GroupSummary[] | null;
  summariesByGroup: Record<string, GroupSummary>;
  globalMaxActivation: number;
  firingStartedAt: number | null;
  lastRunMs: number | null;
  isInferring: boolean;
  selectedLayerId: string | null;
  selectedNeuronIndex: number | null;
  lodByGroup: Record<string, LodLevel>;
  nearGroupId: string | null;

  setModel: (bytes: Uint8Array, name: string) => void;
  setGraph: (graph: Graph, layout: LayerLayout, bounds: LayoutBounds) => void;
  setLoadError: (err: LoadError) => void;
  setSessionStatus: (
    status: SessionStatus,
    extras?: {
      inputNames?: string[];
      outputNames?: string[];
      error?: string | null;
    },
  ) => void;
  setSummaries: (summaries: GroupSummary[], elapsedMs: number) => void;
  setLodMap: (
    map: Record<string, LodLevel>,
    nearGroupId: string | null,
  ) => void;
  clearModel: () => void;
  selectLayer: (id: string | null) => void;
  selectNeuron: (idx: number | null) => void;
  setInferring: (v: boolean) => void;
};

export const useScopeStore = create<ScopeState>((set) => ({
  modelBytes: null,
  modelName: null,
  graph: null,
  layout: null,
  bounds: null,
  loadError: null,
  sessionStatus: 'idle',
  sessionError: null,
  inputNames: [],
  outputNames: [],
  summaries: null,
  summariesByGroup: {},
  globalMaxActivation: 1,
  firingStartedAt: null,
  lastRunMs: null,
  isInferring: false,
  selectedLayerId: null,
  selectedNeuronIndex: null,
  lodByGroup: {},
  nearGroupId: null,

  setModel: (bytes, name) =>
    set({
      modelBytes: bytes,
      modelName: name,
      loadError: null,
      sessionStatus: 'idle',
      sessionError: null,
      inputNames: [],
      outputNames: [],
      summaries: null,
      summariesByGroup: {},
      globalMaxActivation: 1,
      firingStartedAt: null,
      lastRunMs: null,
    }),
  setGraph: (graph, layout, bounds) =>
    set({ graph, layout, bounds, loadError: null }),
  setLoadError: (err) => set({ loadError: err }),
  setSessionStatus: (status, extras) =>
    set({
      sessionStatus: status,
      sessionError: extras?.error ?? null,
      inputNames: extras?.inputNames ?? [],
      outputNames: extras?.outputNames ?? [],
    }),
  setLodMap: (map, nearGroupId) => set({ lodByGroup: map, nearGroupId }),
  setSummaries: (summaries, elapsedMs) => {
    const byId: Record<string, GroupSummary> = {};
    let max = 0;
    for (const s of summaries) {
      byId[s.groupId] = s;
      if (s.max > max) max = s.max;
    }
    set({
      summaries,
      summariesByGroup: byId,
      globalMaxActivation: max > 0 ? max : 1,
      firingStartedAt: performance.now(),
      lastRunMs: elapsedMs,
    });
  },
  clearModel: () =>
    set({
      modelBytes: null,
      modelName: null,
      graph: null,
      layout: null,
      bounds: null,
      loadError: null,
      sessionStatus: 'idle',
      sessionError: null,
      inputNames: [],
      outputNames: [],
      summaries: null,
      summariesByGroup: {},
      globalMaxActivation: 1,
      firingStartedAt: null,
      lastRunMs: null,
      selectedLayerId: null,
      selectedNeuronIndex: null,
      lodByGroup: {},
      nearGroupId: null,
    }),
  selectLayer: (id) => set({ selectedLayerId: id, selectedNeuronIndex: null }),
  selectNeuron: (idx) => set({ selectedNeuronIndex: idx }),
  setInferring: (v) => set({ isInferring: v }),
}));
