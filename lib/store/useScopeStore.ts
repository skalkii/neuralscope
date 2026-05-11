import { create } from 'zustand';
import type { Graph, LayerLayout } from '@/lib/onnx/types';
import type { LayoutBounds } from '@/lib/layout/topologicalLayout';

export type LodLevel = 'far' | 'mid' | 'near';

export type LoadError = { message: string } | null;

export type ScopeState = {
  modelBytes: Uint8Array | null;
  modelName: string | null;
  graph: Graph | null;
  layout: LayerLayout | null;
  bounds: LayoutBounds | null;
  loadError: LoadError;
  isInferring: boolean;
  selectedLayerId: string | null;
  selectedNeuronIndex: number | null;
  globalLod: LodLevel;

  setModel: (bytes: Uint8Array, name: string) => void;
  setGraph: (graph: Graph, layout: LayerLayout, bounds: LayoutBounds) => void;
  setLoadError: (err: LoadError) => void;
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
  isInferring: false,
  selectedLayerId: null,
  selectedNeuronIndex: null,
  globalLod: 'far',

  setModel: (bytes, name) =>
    set({ modelBytes: bytes, modelName: name, loadError: null }),
  setGraph: (graph, layout, bounds) =>
    set({ graph, layout, bounds, loadError: null }),
  setLoadError: (err) => set({ loadError: err }),
  clearModel: () =>
    set({
      modelBytes: null,
      modelName: null,
      graph: null,
      layout: null,
      bounds: null,
      loadError: null,
      selectedLayerId: null,
      selectedNeuronIndex: null,
    }),
  selectLayer: (id) => set({ selectedLayerId: id, selectedNeuronIndex: null }),
  selectNeuron: (idx) => set({ selectedNeuronIndex: idx }),
  setInferring: (v) => set({ isInferring: v }),
}));
