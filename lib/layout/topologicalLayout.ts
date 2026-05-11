import type { Graph, LayerLayout } from '../onnx/types';
import { LAYOUT } from '@/lib/config';

const { X_SPACING, Z_SPACING, BLOCK_WIDTH } = LAYOUT;

export type LayoutBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function computeLayout(graph: Graph): {
  layout: LayerLayout;
  bounds: LayoutBounds;
} {
  const groups = graph.groups;

  const tensorToGroup: Record<string, number> = {};
  groups.forEach((g, i) => {
    for (const l of g.layers)
      for (const out of l.outputs) tensorToGroup[out] = i;
  });

  const incoming: number[][] = groups.map(() => []);
  const outgoing: number[][] = groups.map(() => []);
  groups.forEach((g, i) => {
    if (g.layers.length === 0) return;
    const primaryInputs = g.layers[0].inputs;
    const seen = new Set<number>();
    for (const tn of primaryInputs) {
      const src = tensorToGroup[tn];
      if (src != null && src !== i && !seen.has(src)) {
        seen.add(src);
        incoming[i].push(src);
        outgoing[src].push(i);
      }
    }
  });

  const depth = new Array<number>(groups.length).fill(0);
  const inDeg = incoming.map((arr) => arr.length);
  const queue: number[] = [];
  for (let i = 0; i < groups.length; i++) if (inDeg[i] === 0) queue.push(i);
  while (queue.length) {
    const v = queue.shift() as number;
    for (const w of outgoing[v]) {
      if (depth[w] < depth[v] + 1) depth[w] = depth[v] + 1;
      inDeg[w]--;
      if (inDeg[w] === 0) queue.push(w);
    }
  }

  const byDepth = new Map<number, number[]>();
  for (let i = 0; i < groups.length; i++) {
    const d = depth[i];
    const arr = byDepth.get(d);
    if (arr) arr.push(i);
    else byDepth.set(d, [i]);
  }

  const layout: LayerLayout = {};
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [d, indices] of byDepth.entries()) {
    const lanes = indices.length;
    const centerOff = (lanes - 1) / 2;
    indices.forEach((idx, rank) => {
      const g = groups[idx];
      const heightFactor = Math.log10(g.paramCount + 10);
      const channels =
        g.outputShape && g.outputShape.length > 1
          ? Math.abs(g.outputShape[1])
          : 1;
      const depthFactor = Math.log10(channels + 2);

      const x = d * X_SPACING;
      const z = (rank - centerOff) * Z_SPACING;
      g.depth = d;
      g.branchLane = rank - centerOff;

      layout[g.id] = {
        groupId: g.id,
        position: { x, y: 0, z },
        size: {
          width: BLOCK_WIDTH,
          height: Math.max(0.6, heightFactor * 0.4),
          depth: Math.max(0.6, depthFactor * 0.8),
        },
      };

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    });
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minZ = 0;
    maxZ = 0;
  }

  return { layout, bounds: { minX, maxX, minZ, maxZ } };
}
