// Shared message protocol between inferenceClient (main thread) and
// inferenceWorker (Web Worker). Re-imported on both sides so the
// types can't drift.

export type ExecutionProviderName = 'wasm' | 'webgpu';

export type WorkerInit = {
  kind: 'init';
  id: number;
  modelBytes: ArrayBuffer;
  executionProvider?: ExecutionProviderName;
};

export type WorkerRun = {
  kind: 'run';
  id: number;
  feeds: Record<
    string,
    { data: ArrayBuffer; dims: number[]; dtype: 'float32' }
  >;
};

export type WorkerExtractWeights = {
  kind: 'extract-weights';
  id: number;
  layerInputs: string[];
};

export type WorkerSwitchProvider = {
  kind: 'switch-provider';
  id: number;
  executionProvider: ExecutionProviderName;
};

export type WorkerDispose = { kind: 'dispose' };

export type WorkerRequest =
  | WorkerInit
  | WorkerRun
  | WorkerExtractWeights
  | WorkerSwitchProvider
  | WorkerDispose;

export type WorkerInitOk = {
  kind: 'init-ok';
  id: number;
  inputNames: string[];
  outputNames: string[];
  addedCount: number;
  activeProvider: ExecutionProviderName;
};

export type WorkerRunOk = {
  kind: 'run-ok';
  id: number;
  outputs: Record<string, { data: ArrayBuffer; dims: number[]; dtype: string }>;
  elapsed: number;
};

export type WorkerExtractWeightsOk = {
  kind: 'extract-weights-ok';
  id: number;
  weights: { name: string; dims: number[]; data: ArrayBuffer } | null;
};

export type WorkerSwitchProviderOk = {
  kind: 'switch-provider-ok';
  id: number;
  activeProvider: ExecutionProviderName;
};

export type WorkerErr = { kind: 'err'; id: number; message: string };

export type WorkerResponse =
  | WorkerInitOk
  | WorkerRunOk
  | WorkerExtractWeightsOk
  | WorkerSwitchProviderOk
  | WorkerErr;
