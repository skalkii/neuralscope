import { onnx } from 'onnx-proto';

export type PatchResult = {
  bytes: Uint8Array;
  addedNames: string[];
};

/**
 * Mutates an already-decoded ModelProto so every node-output tensor
 * is also listed in graph.output. Returns the added tensor names.
 */
export function patchAllOutputsOnModel(model: onnx.ModelProto): string[] {
  const graph = model.graph;
  if (!graph) throw new Error('Model has no graph');

  const existing = new Set<string>();
  for (const o of graph.output ?? []) {
    if (o.name) existing.add(o.name);
  }

  const valueInfoByName: Record<string, onnx.IValueInfoProto> = {};
  for (const vi of graph.valueInfo ?? []) {
    if (vi.name) valueInfoByName[vi.name] = vi;
  }
  for (const vi of graph.input ?? []) {
    if (vi.name && !valueInfoByName[vi.name]) valueInfoByName[vi.name] = vi;
  }

  const added: string[] = [];
  graph.output = graph.output ?? [];
  for (const node of graph.node ?? []) {
    for (const outName of node.output ?? []) {
      if (!outName || existing.has(outName)) continue;
      const vi = valueInfoByName[outName];
      if (vi) graph.output.push(vi);
      else graph.output.push(onnx.ValueInfoProto.create({ name: outName }));
      existing.add(outName);
      added.push(outName);
    }
  }
  return added;
}

/**
 * Rewrites an ONNX model so every node's output tensor is also listed
 * in graph.output. After loading into onnxruntime-web, calling
 * session.run() will return every intermediate tensor, not just the
 * model's natural outputs.
 *
 * Type info is preserved from value_info when present; otherwise a
 * minimal { name } entry is emitted. ORT tolerates minimal entries for
 * most operators because shape/type inference re-derives the metadata.
 */
export function patchAllOutputs(bytes: Uint8Array): PatchResult {
  const model = onnx.ModelProto.decode(bytes);
  const added = patchAllOutputsOnModel(model);
  const encoded = onnx.ModelProto.encode(model).finish();
  return { bytes: new Uint8Array(encoded), addedNames: added };
}
