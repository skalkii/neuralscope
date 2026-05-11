import type { Graph } from './types';
import type { TensorResult } from './inferenceClient';
import { SUMMARY } from '@/lib/config';

export type SummaryKind = 'dense' | 'conv' | 'seq' | 'scalar';

export type GroupSummary = {
  groupId: string;
  groupLabel: string;
  outputTensorName: string;
  dims: number[];
  kind: SummaryKind;
  values: Float32Array;
  scalar: number;
  max: number;
  min: number;
  sparsity: number;
};

const { MAX_VALUES } = SUMMARY;

function summarizeOne(
  dims: number[],
  data: Float32Array,
): {
  kind: SummaryKind;
  values: Float32Array;
} {
  if (dims.length === 4) {
    const N = dims[0] || 1;
    const C = dims[1] || 1;
    const H = dims[2] || 1;
    const W = dims[3] || 1;
    const HW = H * W;
    const cap = Math.min(C, MAX_VALUES);
    const stride = Math.max(1, Math.ceil(C / MAX_VALUES));
    const out = new Float32Array(cap);
    let oi = 0;
    for (let c = 0; c < C && oi < cap; c += stride) {
      let sum = 0;
      let count = 0;
      for (let n = 0; n < N; n++) {
        const base = (n * C + c) * HW;
        for (let i = 0; i < HW; i++) {
          sum += Math.abs(data[base + i]);
          count++;
        }
      }
      out[oi++] = count > 0 ? sum / count : 0;
    }
    return { kind: 'conv', values: out };
  }
  if (dims.length === 3) {
    const N = dims[0] || 1;
    const T = dims[1] || 1;
    const F = dims[2] || 1;
    const cap = Math.min(F, MAX_VALUES);
    const stride = Math.max(1, Math.ceil(F / MAX_VALUES));
    const out = new Float32Array(cap);
    let oi = 0;
    for (let f = 0; f < F && oi < cap; f += stride) {
      let sum = 0;
      let count = 0;
      for (let n = 0; n < N; n++) {
        for (let t = 0; t < T; t++) {
          sum += Math.abs(data[(n * T + t) * F + f]);
          count++;
        }
      }
      out[oi++] = count > 0 ? sum / count : 0;
    }
    return { kind: 'seq', values: out };
  }
  if (dims.length === 2) {
    const N = dims[0] || 1;
    const F = dims[1] || 1;
    const cap = Math.min(F, MAX_VALUES);
    const stride = Math.max(1, Math.ceil(F / MAX_VALUES));
    const out = new Float32Array(cap);
    let oi = 0;
    for (let f = 0; f < F && oi < cap; f += stride) {
      let sum = 0;
      for (let n = 0; n < N; n++) sum += Math.abs(data[n * F + f]);
      out[oi++] = sum / N;
    }
    return { kind: 'dense', values: out };
  }
  if (dims.length === 1) {
    const cap = Math.min(dims[0], MAX_VALUES);
    const stride = Math.max(1, Math.ceil(dims[0] / MAX_VALUES));
    const out = new Float32Array(cap);
    for (let i = 0, oi = 0; i < dims[0] && oi < cap; i += stride) {
      out[oi++] = Math.abs(data[i]);
    }
    return { kind: 'dense', values: out };
  }
  return {
    kind: 'scalar',
    values: new Float32Array([data.length > 0 ? Math.abs(data[0]) : 0]),
  };
}

export function summarizeRun(
  graph: Graph,
  outputs: Record<string, TensorResult>,
): GroupSummary[] {
  const summaries: GroupSummary[] = [];
  for (const g of graph.groups) {
    if (g.layers.length === 0) continue;
    const tail = g.layers[g.layers.length - 1];
    const outName = tail.outputs[0];
    if (!outName) continue;
    const tensor = outputs[outName];
    if (!tensor) continue;
    const { kind, values } = summarizeOne(tensor.dims, tensor.data);
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let zeros = 0;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      sum += v;
      if (v > max) max = v;
      if (v < min) min = v;
      if (v === 0) zeros++;
    }
    const mean = values.length > 0 ? sum / values.length : 0;
    if (!Number.isFinite(max)) max = 0;
    if (!Number.isFinite(min)) min = 0;
    summaries.push({
      groupId: g.id,
      groupLabel: g.label,
      outputTensorName: outName,
      dims: tensor.dims,
      kind,
      values,
      scalar: mean,
      max,
      min,
      sparsity: values.length > 0 ? zeros / values.length : 0,
    });
  }
  return summaries;
}
