import { onnx } from 'onnx-proto';
import type { Graph, Layer, LayerGroup } from './types';

const FUSE_INTO = new Set([
  'BatchNormalization',
  'InstanceNormalization',
  'LayerNormalization',
  'GroupNormalization',
  'Relu',
  'LeakyRelu',
  'Gelu',
  'Sigmoid',
  'Tanh',
]);

const MAX_LOGICAL_LAYERS = 500;
const HEAD_KEEP = 100;
const TAIL_KEEP = 100;

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (v && typeof (v as { toNumber?: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return NaN;
}

function dimsFromTensorShape(
  shape: onnx.ITensorShapeProto | null | undefined,
): number[] | null {
  if (!shape || !shape.dim) return null;
  return shape.dim.map((d) => (d.dimValue != null ? toNumber(d.dimValue) : -1));
}

function dimsFromInitializer(dims: ReadonlyArray<unknown>): number[] {
  return dims.map(toNumber);
}

export function parseOnnxBytes(bytes: Uint8Array, modelName: string): Graph {
  let model: onnx.ModelProto;
  try {
    model = onnx.ModelProto.decode(bytes);
  } catch (e) {
    throw new ParseError(
      `Failed to decode ONNX protobuf: ${(e as Error).message}`,
    );
  }
  const graph = model.graph;
  if (!graph) throw new ParseError('Model has no graph');

  const initParams: Record<string, number> = {};
  for (const init of graph.initializer ?? []) {
    if (!init.name) continue;
    const dims = dimsFromInitializer(init.dims ?? []);
    const count = dims.reduce(
      (acc, d) => acc * (Number.isFinite(d) && d > 0 ? d : 1),
      1,
    );
    initParams[init.name] = count;
  }
  const initNames = new Set(Object.keys(initParams));

  const shapeMap: Record<string, number[] | null> = {};
  const collectShape = (vi: onnx.IValueInfoProto) => {
    if (!vi.name) return;
    shapeMap[vi.name] = dimsFromTensorShape(vi.type?.tensorType?.shape);
  };
  graph.input?.forEach(collectShape);
  graph.output?.forEach(collectShape);
  graph.valueInfo?.forEach(collectShape);

  const inputs = (graph.input ?? [])
    .map((vi) => vi.name)
    .filter((n): n is string => Boolean(n) && !initNames.has(n as string));
  const outputs = (graph.output ?? [])
    .map((vi) => vi.name)
    .filter((n): n is string => Boolean(n));

  const layers: Layer[] = [];
  const nodes = graph.node ?? [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const id =
      n.name && n.name.length > 0 ? n.name : `${n.opType ?? 'Op'}_${i}`;
    const op = n.opType ?? 'Unknown';
    const nodeInputs = (n.input ?? []).filter((s): s is string => !!s);
    const nodeOutputs = (n.output ?? []).filter((s): s is string => !!s);

    let paramCount = 0;
    for (const inName of nodeInputs) {
      const p = initParams[inName];
      if (p != null) paramCount += p;
    }

    const activationIn = nodeInputs.find((nm) => !initNames.has(nm));
    const inputShape = activationIn ? shapeMap[activationIn] ?? null : null;
    const outputShape =
      nodeOutputs.length > 0 ? shapeMap[nodeOutputs[0]] ?? null : null;

    layers.push({
      id,
      op,
      inputs: nodeInputs,
      outputs: nodeOutputs,
      inputShape,
      outputShape,
      paramCount,
    });
  }

  const totalParams = layers.reduce((acc, l) => acc + l.paramCount, 0);

  const tensorProducers: Record<string, number> = {};
  for (let i = 0; i < layers.length; i++) {
    for (const out of layers[i].outputs) tensorProducers[out] = i;
  }
  const tensorConsumers: Record<string, number[]> = {};
  for (let i = 0; i < layers.length; i++) {
    for (const inp of layers[i].inputs) {
      (tensorConsumers[inp] ??= []).push(i);
    }
  }

  const fusedInto: Record<number, number> = {};
  const groupRoot = (i: number): number =>
    fusedInto[i] == null ? i : groupRoot(fusedInto[i]);

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!FUSE_INTO.has(l.op)) continue;
    const graphProducers = l.inputs
      .map((tn) => tensorProducers[tn])
      .filter((idx): idx is number => idx != null);
    if (graphProducers.length !== 1) continue;
    const parentIdx = graphProducers[0];
    const parentOutputs = layers[parentIdx].outputs;
    const parentConsumers = parentOutputs.flatMap(
      (tn) => tensorConsumers[tn] ?? [],
    );
    if (parentConsumers.length !== 1 || parentConsumers[0] !== i) continue;
    fusedInto[i] = parentIdx;
  }

  const groups: LayerGroup[] = [];
  for (let i = 0; i < layers.length; i++) {
    if (fusedInto[i] != null) continue;
    const merged: Layer[] = [layers[i]];
    for (let j = i + 1; j < layers.length; j++) {
      if (fusedInto[j] != null && groupRoot(j) === i) merged.push(layers[j]);
    }
    const primary = layers[i];
    const tail = merged[merged.length - 1];
    const label =
      merged.length === 1
        ? primary.op
        : `${primary.op}+${merged
            .slice(1)
            .map((m) => m.op)
            .join('+')}`;
    groups.push({
      id: primary.id,
      primary,
      layers: merged,
      label,
      paramCount: merged.reduce((acc, l) => acc + l.paramCount, 0),
      outputShape: tail.outputShape,
      depth: 0,
      branchLane: 0,
    });
  }

  let truncated = false;
  let finalGroups = groups;
  if (groups.length > MAX_LOGICAL_LAYERS) {
    truncated = true;
    const hidden = groups.length - HEAD_KEEP - TAIL_KEEP;
    const placeholder: LayerGroup = {
      id: '__collapsed__',
      primary: {
        id: '__collapsed__',
        op: 'Collapsed',
        inputs: [],
        outputs: [],
        inputShape: null,
        outputShape: null,
        paramCount: 0,
      },
      layers: [],
      label: `…${hidden} layers hidden…`,
      paramCount: 0,
      outputShape: null,
      depth: 0,
      branchLane: 0,
    };
    finalGroups = [
      ...groups.slice(0, HEAD_KEEP),
      placeholder,
      ...groups.slice(groups.length - TAIL_KEEP),
    ];
  }

  const inputShapes: Record<string, number[] | null> = {};
  for (const n of inputs) inputShapes[n] = shapeMap[n] ?? null;

  return {
    layers,
    groups: finalGroups,
    inputs,
    outputs,
    inputShapes,
    paramCount: totalParams,
    truncated,
    modelName,
  };
}
