import { onnx } from 'onnx-proto';

export type WeightTensor = {
  name: string;
  dims: number[];
  data: Float32Array;
};

function dimToNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (v && typeof (v as { toNumber?: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return 0;
}

function decodeFloatTensor(
  init: onnx.ITensorProto,
): { data: Float32Array; dims: number[] } | null {
  const dims = (init.dims ?? []).map(dimToNumber);
  if (
    init.dataType !== onnx.TensorProto.DataType.FLOAT &&
    init.dataType !== undefined
  ) {
    return null;
  }
  if (init.floatData && init.floatData.length > 0) {
    return { data: Float32Array.from(init.floatData), dims };
  }
  if (init.rawData && init.rawData.length > 0) {
    const raw = init.rawData;
    if (raw.byteLength % 4 !== 0) return null;
    const ab = new ArrayBuffer(raw.byteLength);
    new Uint8Array(ab).set(raw);
    return { data: new Float32Array(ab), dims };
  }
  return null;
}

export function extractWeightsForLayer(
  modelBytes: Uint8Array,
  layerInputNames: string[],
): WeightTensor | null {
  let model: onnx.ModelProto;
  try {
    model = onnx.ModelProto.decode(modelBytes);
  } catch {
    return null;
  }
  const graph = model.graph;
  if (!graph) return null;
  const initByName = new Map<string, onnx.ITensorProto>();
  for (const init of graph.initializer ?? []) {
    if (init.name) initByName.set(init.name, init);
  }
  for (const name of layerInputNames) {
    const init = initByName.get(name);
    if (!init) continue;
    const decoded = decodeFloatTensor(init);
    if (!decoded) continue;
    if (decoded.dims.length < 2) continue;
    return { name, dims: decoded.dims, data: decoded.data };
  }
  return null;
}
