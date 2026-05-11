/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web';
import { patchAllOutputs } from './patchOutputs';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ort.env.wasm.wasmPaths = ctx.location.origin + '/ort-wasm/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.wasm.proxy = false;

let session: ort.InferenceSession | null = null;
let inputNames: string[] = [];
let outputNames: string[] = [];

type InitReq = { kind: 'init'; id: number; modelBytes: ArrayBuffer };
type RunReq = {
  kind: 'run';
  id: number;
  feeds: Record<
    string,
    { data: ArrayBuffer; dims: number[]; dtype: 'float32' }
  >;
};
type DisposeReq = { kind: 'dispose' };
type Req = InitReq | RunReq | DisposeReq;

ctx.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;
  try {
    if (msg.kind === 'init') {
      const raw = new Uint8Array(msg.modelBytes);
      const { bytes, addedNames } = patchAllOutputs(raw);
      session = await ort.InferenceSession.create(bytes, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      inputNames = [...session.inputNames];
      outputNames = [...session.outputNames];
      ctx.postMessage({
        kind: 'init-ok',
        id: msg.id,
        inputNames,
        outputNames,
        addedCount: addedNames.length,
      });
    } else if (msg.kind === 'run') {
      if (!session) throw new Error('inference session not initialized');
      const feeds: Record<string, ort.Tensor> = {};
      for (const [k, v] of Object.entries(msg.feeds)) {
        feeds[k] = new ort.Tensor('float32', new Float32Array(v.data), v.dims);
      }
      const t0 = performance.now();
      const results = await session.run(feeds);
      const elapsed = performance.now() - t0;

      const outputs: Record<
        string,
        { data: ArrayBuffer; dims: number[]; dtype: string }
      > = {};
      const transferables: ArrayBuffer[] = [];
      for (const [k, t] of Object.entries(results)) {
        if (t.type !== 'float32') continue;
        const fdata = t.data as Float32Array;
        const buf = fdata.buffer.slice(
          fdata.byteOffset,
          fdata.byteOffset + fdata.byteLength,
        ) as ArrayBuffer;
        transferables.push(buf);
        outputs[k] = { data: buf, dims: Array.from(t.dims), dtype: t.type };
      }
      ctx.postMessage(
        { kind: 'run-ok', id: msg.id, outputs, elapsed },
        transferables,
      );
    } else if (msg.kind === 'dispose') {
      try {
        await session?.release?.();
      } catch {
        /* ignore */
      }
      session = null;
    }
  } catch (err) {
    ctx.postMessage({
      kind: 'err',
      id: 'id' in msg ? msg.id : -1,
      message: (err as Error).message,
    });
  }
};
