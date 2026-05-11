export type TensorPayload = {
  data: Float32Array;
  dims: number[];
};

export type TensorResult = {
  data: Float32Array;
  dims: number[];
  dtype: string;
};

export type InitInfo = {
  inputNames: string[];
  outputNames: string[];
  addedCount: number;
  activeProvider: 'wasm' | 'webgpu';
};

export type RunResult = {
  outputs: Record<string, TensorResult>;
  elapsedMs: number;
};

type WorkerResponseAny =
  | {
      kind: 'init-ok';
      id: number;
      inputNames: string[];
      outputNames: string[];
      addedCount: number;
      activeProvider: 'wasm' | 'webgpu';
    }
  | {
      kind: 'run-ok';
      id: number;
      outputs: Record<
        string,
        { data: ArrayBuffer; dims: number[]; dtype: string }
      >;
      elapsed: number;
    }
  | {
      kind: 'extract-weights-ok';
      id: number;
      weights: { name: string; dims: number[]; data: ArrayBuffer } | null;
    }
  | { kind: 'err'; id: number; message: string };

type Pending = {
  resolve: (msg: WorkerResponseAny) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./inferenceWorker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (e: MessageEvent<WorkerResponseAny>) => {
    const msg = e.data;
    if (msg.id == null) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.kind === 'err') p.reject(new Error(msg.message));
    else p.resolve(msg);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message));
    pending.clear();
  };
  return worker;
}

export async function initInference(
  bytes: Uint8Array,
  executionProvider: 'wasm' | 'webgpu' = 'wasm',
): Promise<InitInfo> {
  const w = getWorker();
  const id = ++seq;
  const copy = bytes.slice().buffer;
  const promise = new Promise<WorkerResponseAny>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage(
    { kind: 'init', id, modelBytes: copy, executionProvider },
    [copy],
  );
  const msg = await promise;
  if (msg.kind !== 'init-ok') throw new Error('unexpected response');
  return {
    inputNames: msg.inputNames,
    outputNames: msg.outputNames,
    addedCount: msg.addedCount,
    activeProvider: msg.activeProvider,
  };
}

export async function runInference(
  feeds: Record<string, TensorPayload>,
): Promise<RunResult> {
  const w = getWorker();
  const id = ++seq;
  const payload: Record<
    string,
    { data: ArrayBuffer; dims: number[]; dtype: 'float32' }
  > = {};
  const transferables: ArrayBuffer[] = [];
  for (const [k, v] of Object.entries(feeds)) {
    const buf = v.data.buffer.slice(
      v.data.byteOffset,
      v.data.byteOffset + v.data.byteLength,
    ) as ArrayBuffer;
    transferables.push(buf);
    payload[k] = { data: buf, dims: v.dims, dtype: 'float32' };
  }
  const promise = new Promise<WorkerResponseAny>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage({ kind: 'run', id, feeds: payload }, transferables);
  const msg = await promise;
  if (msg.kind !== 'run-ok') throw new Error('unexpected response');
  const outputs: Record<string, TensorResult> = {};
  for (const [k, v] of Object.entries(msg.outputs)) {
    outputs[k] = {
      data: new Float32Array(v.data),
      dims: v.dims,
      dtype: v.dtype,
    };
  }
  return { outputs, elapsedMs: msg.elapsed };
}

export async function extractWeights(
  layerInputs: string[],
): Promise<{ name: string; dims: number[]; data: Float32Array } | null> {
  if (!worker) return null;
  const w = getWorker();
  const id = ++seq;
  const promise = new Promise<WorkerResponseAny>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage({ kind: 'extract-weights', id, layerInputs });
  const msg = await promise;
  if (msg.kind !== 'extract-weights-ok') throw new Error('unexpected response');
  if (!msg.weights) return null;
  return {
    name: msg.weights.name,
    dims: msg.weights.dims,
    data: new Float32Array(msg.weights.data),
  };
}

export function disposeInference(): void {
  if (!worker) return;
  worker.postMessage({ kind: 'dispose' });
  worker.terminate();
  worker = null;
  for (const p of pending.values())
    p.reject(new Error('inference worker disposed'));
  pending.clear();
}
