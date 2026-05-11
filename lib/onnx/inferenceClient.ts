import type {
  WorkerResponse,
  ExecutionProviderName,
} from './inferenceProtocol';

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
  activeProvider: ExecutionProviderName;
};

export type RunResult = {
  outputs: Record<string, TensorResult>;
  elapsedMs: number;
};

type Pending = {
  resolve: (msg: WorkerResponse) => void;
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
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
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

/**
 * Boot the worker, ship it the model bytes, await session creation.
 * Patches every node-output into `graph.output` worker-side so the
 * first (and every) run returns intermediate activations.
 *
 * @param bytes              Raw `.onnx` bytes. Buffer is transferred
 *                            to the worker; do not reuse.
 * @param executionProvider  'wasm' (default) or 'webgpu'. WebGPU
 *                            silently falls back to WASM if init fails;
 *                            `activeProvider` on the returned InitInfo
 *                            reports the resolved EP.
 */
export async function initInference(
  bytes: Uint8Array,
  executionProvider: ExecutionProviderName = 'wasm',
): Promise<InitInfo> {
  const w = getWorker();
  const id = ++seq;
  const copy = bytes.slice().buffer;
  const promise = new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage({ kind: 'init', id, modelBytes: copy, executionProvider }, [
    copy,
  ]);
  const msg = await promise;
  if (msg.kind !== 'init-ok') throw new Error('unexpected response');
  return {
    inputNames: msg.inputNames,
    outputNames: msg.outputNames,
    addedCount: msg.addedCount,
    activeProvider: msg.activeProvider,
  };
}

/**
 * Run inference with the given feeds. All input + output tensor
 * buffers are transferred over `postMessage`, so caller-owned
 * Float32Arrays should not be reused after this call returns.
 */
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
  const promise = new Promise<WorkerResponse>((resolve, reject) => {
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

/**
 * Pull the first float32 ≥2D initializer that matches any of the
 * given input tensor names. Worker uses its cached `ModelProto` —
 * no protobuf decode. Returns null if the worker isn't running or
 * no matching initializer exists (activation-only ops like Relu, Add).
 */
export async function extractWeights(
  tensorInputs: string[],
): Promise<{ name: string; dims: number[]; data: Float32Array } | null> {
  if (!worker) return null;
  const w = getWorker();
  const id = ++seq;
  const promise = new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage({ kind: 'extract-weights', id, tensorInputs });
  const msg = await promise;
  if (msg.kind !== 'extract-weights-ok') throw new Error('unexpected response');
  if (!msg.weights) return null;
  return {
    name: msg.weights.name,
    dims: msg.weights.dims,
    data: new Float32Array(msg.weights.data),
  };
}

/**
 * Recreate the inference session in the worker using a different
 * execution provider but the **same** cached model. Avoids the
 * full ModelProto decode + patchOutputs round-trip that
 * initInference performs. Returns the provider that actually
 * initialized (WASM if WebGPU was requested but failed). Returns
 * null when no worker exists yet — caller should fall back to
 * initInference.
 */
export async function switchProvider(
  executionProvider: ExecutionProviderName,
): Promise<ExecutionProviderName | null> {
  if (!worker) return null;
  const w = getWorker();
  const id = ++seq;
  const promise = new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  w.postMessage({ kind: 'switch-provider', id, executionProvider });
  const msg = await promise;
  if (msg.kind !== 'switch-provider-ok') throw new Error('unexpected response');
  return msg.activeProvider;
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
