import { describe, it, expect } from 'vitest';
import { computeLayout } from './topologicalLayout';
import type { Graph, LayerGroup, Layer } from '../onnx/types';

function layer(id: string, inputs: string[], outputs: string[]): Layer {
  return {
    id,
    op: 'Conv',
    inputs,
    outputs,
    inputShape: null,
    outputShape: null,
    paramCount: 0,
  };
}

function group(id: string, l: Layer): LayerGroup {
  return {
    id,
    primary: l,
    layers: [l],
    label: id,
    paramCount: 0,
    outputShape: null,
    depth: 0,
    branchLane: 0,
  };
}

function graph(groups: LayerGroup[]): Graph {
  return {
    layers: groups.map((g) => g.primary),
    groups,
    inputs: ['in'],
    outputs: [],
    inputShapes: {},
    paramCount: 0,
    truncated: false,
    modelName: 'test',
  };
}

describe('computeLayout', () => {
  it('places sequential groups along increasing X', () => {
    const g = graph([
      group('a', layer('a', ['in'], ['t1'])),
      group('b', layer('b', ['t1'], ['t2'])),
      group('c', layer('c', ['t2'], ['t3'])),
    ]);
    const { layout, bounds } = computeLayout(g);
    expect(layout.a.position.x).toBeLessThan(layout.b.position.x);
    expect(layout.b.position.x).toBeLessThan(layout.c.position.x);
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
  });

  it('puts branches on different Z lanes at the same depth', () => {
    // a fans out to b and c; both at depth 1
    const g = graph([
      group('a', layer('a', ['in'], ['t1'])),
      group('b', layer('b', ['t1'], ['t2'])),
      group('c', layer('c', ['t1'], ['t3'])),
    ]);
    const { layout } = computeLayout(g);
    expect(layout.b.position.x).toBe(layout.c.position.x);
    expect(layout.b.position.z).not.toBe(layout.c.position.z);
  });

  it('handles empty graph without throwing', () => {
    const empty = graph([]);
    const { layout, bounds } = computeLayout(empty);
    expect(Object.keys(layout)).toHaveLength(0);
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(0);
  });
});
