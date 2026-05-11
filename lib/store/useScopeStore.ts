import { create } from 'zustand';

export type LodLevel = 'far' | 'mid' | 'near';

export type ScopeState = {
  modelBytes: Uint8Array | null;
  modelName: string | null;
  isInferring: boolean;
  selectedLayerId: string | null;
  selectedNeuronIndex: number | null;
  globalLod: LodLevel;

  setModel: (bytes: Uint8Array, name: string) => void;
  clearModel: () => void;
  selectLayer: (id: string | null) => void;
  selectNeuron: (idx: number | null) => void;
  setInferring: (v: boolean) => void;
};

export const useScopeStore = create<ScopeState>((set) => ({
  modelBytes: null,
  modelName: null,
  isInferring: false,
  selectedLayerId: null,
  selectedNeuronIndex: null,
  globalLod: 'far',

  setModel: (bytes, name) => set({ modelBytes: bytes, modelName: name }),
  clearModel: () =>
    set({
      modelBytes: null,
      modelName: null,
      selectedLayerId: null,
      selectedNeuronIndex: null,
    }),
  selectLayer: (id) => set({ selectedLayerId: id, selectedNeuronIndex: null }),
  selectNeuron: (idx) => set({ selectedNeuronIndex: idx }),
  setInferring: (v) => set({ isInferring: v }),
}));
