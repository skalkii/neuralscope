import { describe, it, expect } from 'vitest';
import { summarizeRun } from './summarize';
import type { Graph, LayerGroup, Layer } from './types';
import type { TensorResult } from './inferenceClient';

function makeGroup(id: string, outName: string, op = 'Conv'): LayerGroup {
  const layer: Layer = {
    id,
    op,
    inputs: [],
    outputs: [outName],
    inputShape: null,
    outputShape: null,
    paramCount: 0,
  };
  return {
    id,
    primary: layer,
    layers: [layer],
    label: op,
    paramCount: 0,
    outputShape: null,
    depth: 0,
    branchLane: 0,
  };
}

function makeGraph(groups: LayerGroup[]): Graph {
  return {
    layers: groups.map((g) => g.primary),
    groups,
    inputs: [],
    outputs: [],
    inputShapes: {},
    paramCount: 0,
    truncated: false,
    modelName: 'test',
  };
}

describe('summarizeRun', () => {
  it('produces per-channel mean-abs for 4D conv tensors', () => {
    // [N=1, C=2, H=2, W=2] = 8 values
    // channel 0: |±1| → mean 1; channel 1: |±2| → mean 2
    const data = new Float32Array([1, -1, 1, -1, 2, -2, 2, -2]);
    const tensors: Record<string, TensorResult> = {
      out: { data, dims: [1, 2, 2, 2], dtype: 'float32' },
    };
    const graph = makeGraph([makeGroup('g1', 'out')]);
    const summaries = summarizeRun(graph, tensors);
    expect(summaries).toHaveLength(1);
    const s = summaries[0];
    expect(s.kind).toBe('conv');
    expect(s.values.length).toBe(2);
    expect(s.values[0]).toBeCloseTo(1, 4);
    expect(s.values[1]).toBeCloseTo(2, 4);
    expect(s.scalar).toBeCloseTo(1.5, 4);
    expect(s.max).toBeCloseTo(2, 4);
  });

  it('produces per-neuron values for 2D dense tensors', () => {
    const data = new Float32Array([0, -3, 5, -1]);
    const tensors: Record<string, TensorResult> = {
      out: { data, dims: [1, 4], dtype: 'float32' },
    };
    const graph = makeGraph([makeGroup('g1', 'out', 'Gemm')]);
    const [s] = summarizeRun(graph, tensors);
    expect(s.kind).toBe('dense');
    expect(s.values.length).toBe(4);
    expect(Array.from(s.values)).toEqual([0, 3, 5, 1]);
    expect(s.max).toBe(5);
    expect(s.sparsity).toBe(0.25);
  });

  it('handles per-feature on 3D seq tensors', () => {
    // [N=1, T=2, F=2], feature 0: (|1|+|3|)/2 = 2, feature 1: (|2|+|4|)/2 = 3
    const data = new Float32Array([1, 2, 3, 4]);
    const tensors: Record<string, TensorResult> = {
      out: { data, dims: [1, 2, 2], dtype: 'float32' },
    };
    const graph = makeGraph([makeGroup('g1', 'out', 'Attention')]);
    const [s] = summarizeRun(graph, tensors);
    expect(s.kind).toBe('seq');
    expect(s.values.length).toBe(2);
    expect(s.values[0]).toBeCloseTo(2, 4);
    expect(s.values[1]).toBeCloseTo(3, 4);
  });

  it('skips groups without matching tensor output', () => {
    const graph = makeGraph([
      makeGroup('present', 'out_a'),
      makeGroup('missing', 'out_b'),
    ]);
    const tensors: Record<string, TensorResult> = {
      out_a: { data: new Float32Array([1]), dims: [1, 1], dtype: 'float32' },
    };
    const summaries = summarizeRun(graph, tensors);
    expect(summaries.map((s) => s.groupId)).toEqual(['present']);
  });
});
