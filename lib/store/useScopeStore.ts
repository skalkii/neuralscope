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
  lastRunMs: number | null;
  isInferring: boolean;
  selectedLayerId: string | null;
  selectedNeuronIndex: number | null;
  globalLod: LodLevel;

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
  lastRunMs: null,
  isInferring: false,
  selectedLayerId: null,
  selectedNeuronIndex: null,
  globalLod: 'far',

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
  setSummaries: (summaries, elapsedMs) => {
    const byId: Record<string, GroupSummary> = {};
    for (const s of summaries) byId[s.groupId] = s;
    set({ summaries, summariesByGroup: byId, lastRunMs: elapsedMs });
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
      lastRunMs: null,
      selectedLayerId: null,
      selectedNeuronIndex: null,
    }),
  selectLayer: (id) => set({ selectedLayerId: id, selectedNeuronIndex: null }),
  selectNeuron: (idx) => set({ selectedNeuronIndex: idx }),
  setInferring: (v) => set({ isInferring: v }),
}));
